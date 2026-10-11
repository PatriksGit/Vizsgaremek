# E-mailben megerősített regisztráció — terv

Dátum: 2026-10-11 · Állapot: jóváhagyásra vár

## Cél

A regisztrációhoz kötelező e-mail cím kell, és a fiók csak akkor jön létre a PAxAuth
`accounts` táblájában, ha a játékos az e-mailben kapott kódot beváltotta. Addig a
regisztráció egy `pending_registrations` táblában vár.

Sikeres, ha:

- érvénytelen, lejárt vagy túl sokszor elrontott kóddal nem jön létre fiók;
- a kód hossza, lejárata és a próbálkozások maximuma configból állítható;
- a létrejött fiókkal a PAxAuth plugin változatlanul beléptet (uuid, argon2id hash);
- egy e-mail címhez legfeljebb egy fiók tartozik.

## Döntések

| Kérdés | Döntés |
|---|---|
| Hol van a `pending_registrations`? | Az auth (`global`) DB-ben, az `accounts` mellett. A web DB a bolté (csomagok, árak). |
| Táblaprefix? | Nincs: minden pluginnak saját adatbázisa van (Docker). |
| Újraregisztráció függő regisztráció mellett | Felülírja: a régi függő sor törlődik, új kód megy ki. |
| E-mail / fiók | 1 e-mail = 1 fiók. |
| `user:register` parancs | Bekéri az e-mailt, ellenőrzi, hogy szabad-e, és kód nélkül, azonnal létrehozza a fiókot. |
| Levélküldés | Brevo SMTP (alternatíva: Resend SMTP). Csak config, új csomag nélkül. |

## Végpontok

### `POST /api/register` — regisztráció indítása

Kérés: `display_name`, `email`, `password`, `password_confirmation`.

Validáció:

- `display_name`: a mostani Minecraft-szabály (3–16 karakter, `A-Z a-z 0-9 _`); a belőle
  képzett kisbetűs `username` nem lehet foglalt az `accounts`-ban;
- `email`: kötelező, érvényes, max. 255 karakter, nem lehet foglalt az `accounts`-ban;
  kisbetűsítve és levágott szóközökkel tároljuk és hasonlítjuk;
- `password`: a mostani szabályok (min/max hossz configból, megerősítés).

Lépések, egy tranzakcióban a `global` kapcsolaton:

1. a lejárt függő sorok törlése;
2. a függő sorok törlése, amelyeknek ugyanez a `username` vagy `email` értéke (felülírás);
3. új függő sor beszúrása (jelszó argon2id hash-sel, kód HMAC-kal);
4. a kódot tartalmazó e-mail elküldése, szinkron módon.

Ha a levélküldés kivételt dob, a tranzakció visszagörgetődik (nem marad függő sor),
a hiba a logba kerül, a válasz **503**.

Sikeres válasz: **202 Accepted**

```json
{ "data": { "email": "player@example.com", "expires_at": "2026-10-11T12:15:00Z" } }
```

Rate limit: a mostani `throttle:5,1` marad.

### `POST /api/register/verify` — kód beváltása

Kérés: `email`, `code`.

1. A függő sor keresése a (kisbetűsített) e-mail alapján.
2. Nincs sor, vagy lejárt → **422**, `code` mező: „A kód érvénytelen vagy lejárt.”
3. Rossz kód (`hash_equals` a HMAC-okon) → az `attempts` atomikus növelése; ha elérte a
   `max-attempts` értéket, a sor törlődik. Válasz: ugyanaz a **422**, ugyanazzal az
   üzenettel (nem árulja el, létezik-e függő regisztráció).
4. Jó kód → tranzakció a `global` kapcsolaton:
   - a függő sor zárolása (`lockForUpdate`);
   - a `username` és az `email` újraellenőrzése az `accounts`-ban; ha időközben foglalt
     lett (pl. a `user:register` paranccsal), a függő sor törlődik, a válasz **422** a
     `display_name` vagy az `email` mezőnél;
   - a fiók létrehozása az `accounts`-ban (`uuid`, `username`, `display_name`,
     `password_hash`, `email`); a `registered_ip` a plugin alapértékén marad;
   - a függő sor törlése.

Sikeres válasz: **201**, a mostani `AccountResource` (`uuid`, `username`, `display_name`).

Rate limit: `throttle:10,1`.

Két egyidejű, helyes beváltásnál a zárolás és az `accounts` unique indexei miatt legfeljebb
egy fiók jön létre; a vesztes kérés 422-t kap.

## `user:register` parancs

`php artisan user:register {username?} {email?} {--password=}`. A hiányzó értékeket
bekéri (`Username`, `Email`, a jelszót rejtve, kétszer). Ugyanaz a validáció, mint a
`POST /api/register`-nél (név, e-mail foglaltság, jelszó), de nincs függő sor és nincs
levél: a fiók azonnal létrejön, e-maillel együtt.

## Adat

### `pending_registrations` (auth DB, Laravel-migráció a `global` kapcsolaton)

| oszlop | típus | megjegyzés |
|---|---|---|
| `id` | bigint, PK | |
| `username` | varchar(16) ascii, unique | kisbetűs keresőnév |
| `display_name` | varchar(16) ascii | |
| `email` | varchar(255), unique | kisbetűsítve |
| `password_hash` | varchar(255) | argon2id, ugyanaz a formátum, mint az `accounts`-ban |
| `code_hash` | char(64) | HMAC-SHA256(kód, `APP_KEY`), hex |
| `attempts` | unsigned tinyint, default 0 | rossz próbálkozások |
| `expires_at` | datetime, index | |
| `created_at` | datetime | |

A migráció `protected $connection = 'global'`. Figyelem: a `php artisan migrate:fresh`
csak az alapértelmezett DB-t üríti, a `global`-ban lévő táblát nem; ezt a parancsot éles
auth DB mellett nem szabad használni.

### `accounts` (PAxAuth, változatlan séma)

Az `Account` modell `email` mezővel bővül (fillable). Az `accounts.email`-en a plugin
sémájában nincs unique index, az egyediséget a backend validációja és a beváltáskori
újraellenőrzés biztosítja.

## A kód

- Csak számjegyek, hossza configból (alapból 6), `random_int`-tel generálva.
- Tárolás: `hash_hmac('sha256', $code, APP_KEY)`. Argon2 nem kell: a próbálkozás-limit
  és a rate limit miatt a gyors hash elég, és nem visz el kérésenként 128 MB memóriát.
- Lejárat configból (alapból 15 perc), próbálkozások maximuma configból (alapból 5).

## Config

`config.example.yml` új részei (a meglévő minta szerint env változókká alakulnak):

```yaml
mail:
  mailer: smtp
  host: smtp-relay.brevo.com
  port: 587
  username: ""          # Brevo SMTP login
  password: ""          # Brevo SMTP key
  from:
    address: no-reply@runeempire.net
    name: RuneEmpire

registration:
  code:
    length: 6
    expires-minutes: 15
    max-attempts: 5
```

- A `mail.*` kulcsok a Laravel saját `MAIL_*` változóivá válnak (`MAIL_MAILER`,
  `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`,
  `MAIL_FROM_NAME`), ezért nem kell `config/mail.php`.
- A `registration.code.*` a `config/auth.php`-ba kerül `registration_code` kulcs alá,
  a meglévő `password_length` mellé.
- Resendre váltás: `host: smtp.resend.com`, `username: resend`, `password:` az API key.

## A levél

Laravel Notification (`MailMessage`), view fájlok nélkül, névtelen címzettnek
(`Notification::route('mail', $email)`), nem queue-zva. Magyar szöveg, pl.:

> Tárgy: RuneEmpire regisztrációs kód
>
> A regisztrációs kódod: **482913**. A kód 15 percig érvényes.
> Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.

## Tesztek

- `RegisterTest` átírása: a register már nem hoz létre fiókot, hanem függő sort és
  levelet (Notification fake); a meglévő validációs esetek maradnak, plusz e-mail esetek
  (hiányzik, érvénytelen, foglalt az `accounts`-ban).
- Felülírás: második regisztráció ugyanarra a névre/e-mailre → egy függő sor marad,
  a régi kód már nem váltható be.
- Levélküldési hiba → 503, nem marad függő sor.
- Új `VerifyRegistrationTest`:
  - jó kód → 201, fiók létrejön (uuid, argon2id hash, e-mail), függő sor törlődik;
  - rossz kód → 422, `attempts` nő; a maximum elérésekor a függő sor törlődik;
  - lejárt kód és nem létező e-mail → ugyanaz a 422;
  - időközben foglalt név vagy e-mail → 422, függő sor törlődik;
  - rate limit.
- A config számít: más kódhossz/lejárat mellett a teszt mást vár.
- `RegisterUserCommandTest`: e-mail bekérése, foglalt e-mail elutasítása, a fiók az
  e-maillel jön létre, levél nem megy ki.

## Nem része ennek a lépésnek

- Login, logout, tokenek.
- Kód újraküldése külön végpontként (az újraregisztráció kiváltja).
- Elfelejtett jelszó, e-mail-csere, 2FA.
