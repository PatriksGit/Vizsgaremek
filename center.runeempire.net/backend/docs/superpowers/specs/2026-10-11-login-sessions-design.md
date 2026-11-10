# Bejelentkezés Redis-sessionnel — terv

Dátum: 2026-10-11 · Állapot: két advisor-review után kiegészítve, jóváhagyásra vár

## Cél

A játékos a weboldalon felhasználónévvel és jelszóval bejelentkezik. A session a
Redisben tárolódik és tétlenség után magától lejár; a böngésző csak egy HttpOnly
cookie-t kap, amit a backend állít be. Kilépéskor a session teljesen törlődik.

Csak weboldal lesz (nincs mobilapp), ezért nincs JWT és nincs API token.

Sikeres, ha:

- belépés után a frontend minden kérése automatikusan azonosítva van a cookie-val;
- kilépés vagy lejárat után nincs, és a session nem olvasható ki JavaScriptből;
- a belépés soha nem ír a PAxAuth `accounts` táblájába;
- ha a Redis nem elérhető, egyértelmű „Váratlan hiba történt.” hibát kap a felhasználó.

## Döntések

| Kérdés | Döntés |
|---|---|
| Megközelítés | Laravel session + Sanctum SPA (stateful) mód. |
| Belépési adatok | `username` + `password` (a felhasználónév kis-/nagybetűtől független). |
| Session tárolása | Redis (`phpredis` 6.3 bővítmény; nincs új composer csomag). |
| Lejárat | Csúszó: minden kérés megújítja, alapból 120 perc tétlenség után lejár; configból állítható. |
| Redis nem elérhető | 500, `{"message": "Váratlan hiba történt."}`, a részletek a logba. |
| Élesben | Frontend `center.runeempire.net`, backend `center.runeempire.net/api` (egy origin). |
| Fejlesztésben | Frontend `localhost:5173`, backend `localhost:8000`; javaslat a frontendnek: Vite proxy a `/api`-ra, így fejlesztésben is egy origin. |
| Most kimarad | `locked` fiókok, fióktörlés kezelése, „remember me”, 2FA. |

## Végpontok

Minden auth végpont az `/api/auth` alá kerül; a regisztráció is ide költözik.

| Végpont | Leírás | Siker |
|---|---|---|
| `POST /api/auth/register` | a mostani `/api/register` (változatlan viselkedés) | 202 |
| `POST /api/auth/register/verify` | a mostani `/api/register/verify`, és sikeres beváltás után **egyből be is jelentkezteti** a játékost (ha a weboldalról jön, azaz van session) | 201 + session cookie |
| `POST /api/auth/login` | `username`, `password` | 200 + `AccountResource` (`uuid`, `username`, `display_name`), session cookie |
| `POST /api/auth/logout` | csak bejelentkezve; a session törlése | 204 |
| `GET /api/auth/me` | csak bejelentkezve | 200 + `AccountResource` |
| `GET /api/sanctum/csrf-cookie` | a Sanctum CSRF-cookie végpontja, az `/api` alá téve | 204 |

### `POST /api/auth/login`

- Csak a weboldalról (Sanctum stateful origin) hívható, mert csak ott van session. Ha a
  kérés nem stateful originről jön (pl. Postman `Origin` header nélkül, curl), **403**:
  „A bejelentkezés csak a weboldalról lehetséges.” — nem 500 („Session store not set”).
  Session middleware-t nem teszünk minden originre, mert az CSRF-ellenőrzés nélküli
  sessiont adna (login CSRF).
- Validáció: `username` kötelező string, `bail` + a Minecraft-név minta (3-16 karakter,
  `A-Za-z0-9_`) **minden adatbázis-lekérdezés előtt**, mert a PAxAuth `username` oszlopa
  ascii (nem ASCII bemenet MySQL-en collation-hibát → 500-at adna, ahogy a regisztrációnál
  is). Ha a minta nem illik, ugyanaz a 422 jön, mint rossz jelszónál. `password`
  kötelező string, max. 128 karakter (túl hosszú bemenet ne jusson el az argon2-ig).
- A fiókot a `username` kisbetűsített alakjával keresi (ugyanúgy, ahogy a plugin).
- Rossz felhasználónév és rossz jelszó ugyanazt adja: **422** a `username` mezőn,
  „Hibás felhasználónév vagy jelszó.” Ez felhasználói élmény, nem a nevek kifürkészése
  elleni védelem (a regisztráció úgyis megmondja, ha egy név foglalt).
- Siker: a session azonosítója újragenerálódik (session fixation ellen), a válasz 200.
- Rate limit: nevesített `login` limiter, két külön kulccsal és értékkel: percenként
  5 kérés **felhasználónév + IP párosonként** (egy játékos jelszavának próbálgatása ellen)
  és 20 kérés **IP-nként** összesen; túllépéskor 429. Ha a kettő egyenlő lenne, a
  páros limit semmit nem érne (ugyanarról az IP-ről jön). Csak
  felhasználónévre nem kulcsolunk: a Minecraft-nevek nyilvánosak, így bárki
  kizárhatna egy játékost bármelyik IP-ről.
- A PAxAuth által (Java, `argon2-jvm`) készített hash-eket a PHP is elfogadja — ellenőrizve:
  a plugin könyvtárával generált `$argon2id$v=19$m=131072,t=3,p=4$...` hash-re a
  `Hash::check` `true`, ékezetes jelszóval is. Egy ilyen hash tesztfixtúra lesz.

### `POST /api/auth/register/verify` — automatikus belépés

- A fiók létrejötte után ugyanúgy jelentkeztet be, mint a login (session-újragenerálással).
  A belépés a fiókot létrehozó tranzakció **után** történik (nem az újrapróbálható
  tranzakción belül), és csak ha a kérésnek van sessionje.
- Ha a kérés nem a weboldalról jön (nincs session, pl. Postman `Origin` nélkül), a fiók
  ugyanúgy létrejön és 201 a válasz, csak bejelentkezés nincs. Itt nincs 403, mert a
  beváltás nem kötődik a sessionhöz.

### `POST /api/auth/logout`

- Kijelentkeztet, érvényteleníti a sessiont (a Redis-kulcs törlődik) és új CSRF-tokent
  generál; a session cookie lejár. Bejelentkezés nélkül 401.

### `GET /api/auth/me`

- A bejelentkezett fiók adatai; bejelentkezés nélkül 401.

## Session, Redis, cookie

- `session.driver = redis`, a Laravel alapértelmezett `default` Redis-kapcsolatán.
  A session kulcs TTL-je a lifetime; minden kérés megújítja (csúszó lejárat).
- **Megosztott Redis**: ugyanabban a Redis-példányban fut a Pterodactyl, a LuckPerms és a
  többi szolgáltatás is. Ezért a sessionök **saját Redis adatbázis-indexet** kapnak
  (`redis.db`, alapból `3`), amit semmi más nem használ, és ami soha nem közös egyetlen
  cache store-ral sem (a miénkkel sem). Ok: a Laravel `cache:clear` redis cache store-on
  az egész indexen `FLUSHDB`-t futtat, a kulcs-előtag ez ellen nem véd — ha a session
  és egy cache ugyanazon az indexen lenne, egy `cache:clear` minden játékost kiléptetne.
  A Pterodactyl is Laravel, a 0-s és 1-es index a legvalószínűbben foglalt.
- A backend cache store-ja `database` marad (`CACHE_STORE=database`).
- A kulcsok a Laravel előtagjával (`runeempire-center-database-...`) kezdődnek.
- Cookie: HttpOnly, `SameSite=Lax`, host-only (nincs `domain`), `Secure` configból
  (élesben `true`). A backend állítja be, a JavaScript nem látja.
- Sanctum: `statefulApi()` a `bootstrap/app.php`-ben; a stateful domainek configból
  (`localhost:5173`, élesben `center.runeempire.net`). Az ezekről érkező kérések kapják a
  sessiont és a CSRF-ellenőrzést (a regisztrációs végpontok is).
- A Sanctum route prefixe `api/sanctum`, mert élesben a proxy csak az `/api`-t küldi a
  backendnek.
- Az `Account` modell `Authenticatable` lesz: a jelszó a `password_hash` oszlopból jön,
  remember token nincs (az `accounts` táblában nincs ilyen oszlop).
- `hashing.rehash_on_login = false`: a belépés soha nem írja újra a hash-t a plugin
  táblájában.
- A `CORS` csak fejlesztéshez kell (élesben egy origin): `supports_credentials = true`.

## Config

`config.example.yml` új részei:

```yaml
redis:
  host: 127.0.0.1
  port: 6379
  password: ""
  db: 3                       # csak a sessionöké; ne használja más és semmilyen cache

session:
  driver: redis
  lifetime: 120               # perc tétlenség után lejár
  secure-cookie: false        # élesben true (HTTPS)

sanctum:
  stateful-domains:
    - localhost:5173
    # élesben: center.runeempire.net

rate-limits:
  login:
    per-minute: 5             # felhasználónév + IP párosonként
    per-minute-per-ip: 20     # egy IP-ről összesen
```

A kulcsok a Laravel saját env változóira képeződnek, így ezekhez nem kell config fájl:
`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `SESSION_DRIVER`, `SESSION_LIFETIME`,
`SESSION_SECURE_COOKIE`, `SANCTUM_STATEFUL_DOMAINS` (a lista vesszővel összefűzve).
A `rate-limits.login.per-minute` a meglévő `config/rate_limits.php`-ba kerül. A tesztekben
a `phpunit.xml` `SESSION_DRIVER=array`-t használ (a Redis-kiesés tesztje kivétel).

## Hibák

Minden válasz JSON.

| Helyzet | Válasz |
|---|---|
| rossz felhasználónév vagy jelszó | 422, `username`: „Hibás felhasználónév vagy jelszó.” |
| hiányzó / rossz típusú mező | 422 a mezőn |
| túl sok login-próbálkozás | 429 |
| `/me` vagy `/logout` bejelentkezés nélkül | 401 — `Accept` header nélkül is (most egy nem létező `login` route-ra irányítana és 500-at adna) |
| hiányzó / rossz CSRF-token | 419 „CSRF token mismatch.” |
| a Redis nem elérhető | 500, „Váratlan hiba történt.”, a kivétel a logba kerül |
| login nem stateful originről | 403, „A bejelentkezés csak a weboldalról lehetséges.” |

Elfogadott következmény: ha a Redis nem elérhető, nem csak a login, hanem **minden**
weboldalról jövő (stateful) kérés 500-at ad, a regisztráció és a kódbeváltás is, mert a
session mindegyikhez a Redisből jön.

## Tesztek

- A login és a `/me` tesztek stateful `Origin: http://localhost:5173` headerrel küldenek
  kérést; a `phpunit.xml` rögzíti a `SANCTUM_STATEFUL_DOMAINS=localhost:5173` értéket.
- Login: sikeres belépés (200, bejelentkezett állapot, új session-azonosító);
  kis-/nagybetűtől független felhasználónév; rossz jelszó és nem létező név ugyanaz a 422;
  nem ASCII / mintának nem megfelelő név → ugyanaz a 422, és a `username` oszlopot nem
  érinti lekérdezés (`assertNoQueryMentions`); túl hosszú jelszó → 422;
  a PAxAuth-fixtúra hash-sel (Java által készített) belép; a jelszó-hash a belépés után
  változatlan; a login rate limit a configból jön, és felhasználónév+IP-re is számol;
  nem stateful originről 403.
- `/me`: 401 belépés nélkül (`Accept` header nélkül is), 200 belépve.
- Logout: utána a `/me` 401, a session érvénytelen; belépés nélkül 401.
- Redis kiesés: session driver egy nem futó Redis-portra állítva → 500 „Váratlan hiba
  történt.” A teszt `#[RequiresPhpExtension('redis')]`, mert a csapattársak gépén és CI-ban
  nem biztos, hogy van `phpredis`.
- A regisztrációs tesztek az új `/api/auth/...` útvonalakra kerülnek.
- Beváltás: weboldalról (stateful `Origin`) sikeres beváltás után a játékos be van
  jelentkezve, a `/me` 200; `Origin` nélkül a fiók létrejön (201), de nincs bejelentkezés.
- A CSRF-folyamatot (csrf-cookie → login) a tesztkörnyezet nem ellenőrzi (a Laravel
  tesztekben kikapcsolja), ezt élesben, Postman collectionnel ellenőrizzük.

## Trusted proxies (Cloudflare Tunnel)

Élesben a forgalom Cloudflare Tunnelen jön: a `cloudflared` a `127.0.0.1`-ről továbbítja a
kéréseket, így a Laravel minden kérést `127.0.0.1`-ről látna, és az IP-alapú limitek
(login, regisztráció) az egész oldalra közösek lennének.

- A `config.yml` `trusted-proxies` listája (alapból `127.0.0.1`) megbízható proxyként
  van beállítva a `bootstrap/app.php`-ban (`trustProxies`), **csak** az
  `X-Forwarded-For` és az `X-Forwarded-Proto` headerrel. Így a `$request->ip()` a valódi
  kliens IP-je, és a Laravel felismeri, hogy az eredeti kérés HTTPS volt.
- Az `X-Forwarded-Host`, `-Port` és `-Prefix` **nem** megbízható: ezeket a kliens is
  küldheti a tunnelen át, és megváltoztatnák az `url()`-t (később a jelszó-visszaállító
  és megerősítő linkek a támadó által választott hostra mutatnának).
- A várt működés: a Cloudflare a kliens IP-t a `X-Forwarded-For` végére fűzi, és a
  Laravel jobbról olvasva a megbízható proxyt kihagyja, így a kliens által küldött hamis
  érték nem számít. Ezt élesben ellenőrizni kell (lásd „Élesítés előtt”), addig nem
  tekintjük igazoltnak. Feltétel: a backend portja csak a tunnel felől legyen elérhető.
- Teszt: `X-Forwarded-For` headerrel két különböző kliens IP-ről jövő login-kérés külön
  limitet kap; nem megbízható címről jövő kérés `X-Forwarded-For`-ja nem számít; egy
  megbízható címről érkező hamis `X-Forwarded-Host` nem változtatja meg a
  `request()->getHost()`-ot. A `phpunit.xml` rögzíti a `TRUSTED_PROXIES` értékét.

```yaml
trusted-proxies:
  - 127.0.0.1
```

## Élesítés előtt

- Élesben `session.secure-cookie: true` (kifejezetten beállítva, nem az automatikus mód:
  az csak akkor jelöli Secure-nak a cookie-t, ha a trusted proxy helyesen be van állítva)
  és `sanctum.stateful-domains: center.runeempire.net`.
- A backend portja csak a tunnel felől legyen elérhető.
- **A trusted proxy címének ellenőrzése**: a `127.0.0.1` csak akkor helyes, ha a PHP a
  hoston fut. Ha a backend Docker konténerben fut, a `REMOTE_ADDR` a bridge gateway lesz
  (pl. `172.x.0.1`, mint a MySQL-nél látott `root@172.18.0.1`). Az első, tunnelen át
  érkező kérésnél naplózni kell a `$request->ip()`-t és a `REMOTE_ADDR`-t, a
  `trusted-proxies`-t arra kell állítani, amit az app ténylegesen lát, és ellenőrizni,
  hogy a tunnelen át küldött hamis `X-Forwarded-For` nem változtatja meg az `ip()`-t.
- **A Redis-index ellenőrzése** az éles szerveren: a `redis-cli INFO keyspace` mellett a
  Pterodactyl `.env` Redis DB-beállításait is meg kell nézni (egy index be lehet állítva
  akkor is, ha még nincs benne kulcs).

## Nem része ennek a lépésnek

- `locked` fiókok, fióktörlés, „remember me”, 2FA, jelszó-visszaállítás.
- A frontend Vite proxy beállítása (a frontend csapat dolga; javaslatként átadjuk).
