# Bejelentkezés Redis-sessionnel — megvalósítási terv

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Felhasználónév + jelszó alapú bejelentkezés Laravel sessionnel a Redisben (HttpOnly cookie, Sanctum SPA mód), `/api/auth/{login,logout,me}`, automatikus belépés kódbeváltás után, Cloudflare Tunnel mögötti valódi kliens IP.

**Architecture:** A Laravel beépített session guardja (`web`) és a Sanctum stateful API módja: a weboldalról (stateful origin) jövő kérések sessiont és CSRF-védelmet kapnak, a session a Redisben él. Az `Account` modell `Authenticatable` lesz (`password_hash` oszlop). A login egy vékony invokable controller (`Auth::attempt`), a limitek a meglévő `config/rate_limits.php`-ban.

**Tech Stack:** Laravel 13.34, PHP 8.4 + phpredis 6.3, Sanctum 4, PHPUnit 12; tesztekben `SESSION_DRIVER=array`, SQLite in-memory.

**Spec:** `docs/superpowers/specs/2026-10-11-login-sessions-design.md`

## Global Constraints

- Minden parancs a `center.runeempire.net/backend` mappából fut.
- **Nem commitolunk** (projektszabály). A „Commit” lépések helyén a Pint fut: `vendor/bin/pint --dirty --format agent`.
- Új fájlok `php artisan make:* --no-interaction`-nel, utána a tartalom felülírva.
- Új composer/npm függőség nem kerül be (a Redis kliens a `phpredis` bővítmény).
- Kód/azonosítók/kommentek angolul; a játékosnak szóló saját üzenetek magyarul.
- A PAxAuth `accounts` táblájába a login soha nem ír (`hashing.rehash_on_login = false`).
- A felhasználói `config.yml`-t nem írjuk felül; csak a `config.example.yml` változik.
- Értékek a specből: session lifetime `120` perc, Redis DB index `3`, login limit `5`/perc felhasználónév+IP, CSRF route `api/sanctum/csrf-cookie`, trusted proxy alapból `127.0.0.1`, megbízható headerek csak `X-Forwarded-For` és `X-Forwarded-Proto`.
- Üzenetek szó szerint: „Hibás felhasználónév vagy jelszó.”, „A bejelentkezés csak a weboldalról lehetséges.”, „Váratlan hiba történt.”

## Review Focus

1. **Szóközzel körülvett felhasználónév** (` PatrikT `) — a `TrimStrings` levágja, a belépésnek működnie kell. → Task 2, `test_username_is_case_insensitive_and_trimmed`.
2. **Bejelentkezett játékos egy másik fiókkal lép be** — az új fiókra kell váltania, nem a régiben maradni. → Task 2, `test_logging_in_again_switches_to_the_new_account`.
3. **Kétszeri kilépés** — a második 401, nem 500. → Task 3, `test_logout_without_login_returns_401`.
4. **CSRF a valódi böngészőből** (csrf-cookie → login → me) — a tesztkörnyezet kikapcsolja a CSRF-ellenőrzést. → Task 4, 6. lépés, kézi ellenőrzés.
5. **Csúszó lejárat a Redisben** (TTL megújul minden kérésnél, kilépéskor a kulcs törlődik) — array driverrel nem tesztelhető. → Task 4, 6. lépés, kézi ellenőrzés `redis-cli`-vel.

---

### Task 1: Az auth végpontok az `/api/auth` alá költöznek

**Files:**
- Modify: `routes/api.php`
- Modify: `tests/Feature/RegisterTest.php`, `tests/Feature/VerifyRegistrationTest.php`

**Interfaces:**
- Produces: `POST /api/auth/register` (név: `auth.register`), `POST /api/auth/register/verify` (név: `auth.register.verify`); az `/api/auth` route-csoport, amibe a későbbi taskok tesznek.

- [ ] **Step 1: A tesztek az új útvonalakra**

Run:

```bash
sed -i "s#'/api/register/verify'#'/api/auth/register/verify'#g; s#'/api/register'#'/api/auth/register'#g" tests/Feature/RegisterTest.php tests/Feature/VerifyRegistrationTest.php
grep -c "/api/auth/register" tests/Feature/RegisterTest.php tests/Feature/VerifyRegistrationTest.php
```

Expected: mindkét fájlban 0-nál több találat; `grep -n "'/api/register" tests/Feature/*.php` üres.

- [ ] **Step 2: Futtasd, hogy elbukjanak**

Run: `php artisan test --compact tests/Feature/RegisterTest.php tests/Feature/VerifyRegistrationTest.php`
Expected: FAIL — 404 az `/api/auth/...` útvonalakra.

- [ ] **Step 3: Route-csoport**

`routes/api.php` teljes tartalma:

```php
<?php

use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => ['status' => 'ok']);

Route::prefix('auth')->name('auth.')->group(function () {
    Route::post('/register', RegisterController::class)
        ->middleware('throttle:register')
        ->name('register');

    Route::post('/register/verify', VerifyRegistrationController::class)
        ->middleware('throttle:register-verify')
        ->name('register.verify');
});
```

- [ ] **Step 4: Futtasd a teljes suite-ot és a Pintet**

Run: `php artisan test --compact && vendor/bin/pint --dirty --format agent`
Expected: minden PASS (83), Pint `passed`.

---

### Task 2: Login (session + Sanctum stateful + `Authenticatable` fiók)

**Files:**
- Create: `app/Http/Controllers/Auth/LoginController.php`
- Create: `app/Http/Requests/LoginRequest.php`
- Create: `config/sanctum.php`, `config/session.php`
- Modify: `app/Models/Account.php`, `app/Http/Requests/RegisterRequest.php`
- Modify: `config/hashing.php`, `config/rate_limits.php`, `bootstrap/app.php`, `routes/api.php`, `phpunit.xml`
- Test: `tests/Feature/LoginTest.php`

**Interfaces:**
- Consumes: `Account::usernameFor()`, `AccountResource`, `TestCase::createAccountsTable()`, `TestCase::assertNoQueryMentions()`.
- Produces:
  - `Account::NAME_PATTERN` (public const, a Minecraft-név minta; a `RegisterRequest` is ezt használja).
  - `Account implements Illuminate\Contracts\Auth\Authenticatable` (`getAuthPasswordName()` → `'password_hash'`, `getRememberTokenName()` → `''`).
  - `POST /api/auth/login` (név: `auth.login`, limiter: `login`) → 200 `AccountResource`, vagy 422 `username` „Hibás felhasználónév vagy jelszó.”, vagy 403.
  - `LoginController::INVALID_CREDENTIALS` (public const string).
  - Config: `rate_limits.login.per_minute` (felhasználónév+IP, alap 5), `rate_limits.login.per_minute_per_ip` (alap 20).
  - Teszt-segéd a `LoginTest`-ben: `private const FRONTEND = 'http://localhost:5173'`.

- [ ] **Step 1: Generáld a fájlokat**

Run:

```bash
php artisan make:request LoginRequest --no-interaction
php artisan make:controller Auth/LoginController --invokable --no-interaction
php artisan make:test LoginTest --phpunit --no-interaction
```

- [ ] **Step 2: Írd meg a tesztet**

`tests/Feature/LoginTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Http\Controllers\Auth\LoginController;
use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = 'http://localhost:5173';

    /**
     * Made by PAxAuth's own hasher (argon2-jvm 2.12, iterations 3, 128 MiB, 4 lanes)
     * for the password "titkos-jelszo".
     */
    private const PLUGIN_HASH = '$argon2id$v=19$m=131072,t=3,p=4$8tYmWSvlEWcQTgkQa4byaQ$zXZHMX4uDnPxBJ8QXQN7kl3JoMEa+mHScMr7XvHi1E8';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(string $displayName = 'PatrikT'): Account
    {
        return Account::factory()->create([
            'display_name' => $displayName,
            'password_hash' => Hash::make('titkos-jelszo'),
        ]);
    }

    /**
     * Insert an account with a hash the plugin made, past the model's hashed
     * cast (which only accepts hashes within the test's argon2 settings).
     */
    private function pluginAccount(): int
    {
        return DB::connection('global')->table('accounts')->insertGetId([
            'uuid' => Account::offlineUuid('PatrikT'),
            'username' => 'patrikt',
            'display_name' => 'PatrikT',
            'password_hash' => self::PLUGIN_HASH,
        ]);
    }

    private function login(mixed $username = 'PatrikT', mixed $password = 'titkos-jelszo', bool $fromWebsite = true): TestResponse
    {
        $headers = $fromWebsite ? ['Origin' => self::FRONTEND] : [];

        return $this->postJson('/api/auth/login', ['username' => $username, 'password' => $password], $headers);
    }

    public function test_valid_credentials_log_in_and_return_the_account(): void
    {
        $account = $this->account();

        $this->login()
            ->assertOk()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_session_id_is_regenerated_on_login(): void
    {
        $this->account();
        $session = $this->app['session']->driver();
        $session->start();
        $oldId = $session->getId();
        $session->save();

        $this->withCookie(config('session.cookie'), $oldId)->login()->assertOk();

        $this->assertNotSame($oldId, $this->app['session']->driver()->getId());
    }

    public function test_username_is_case_insensitive_and_trimmed(): void
    {
        $account = $this->account();

        $this->login(' patrikt ')->assertOk();

        $this->assertAuthenticatedAs($account, 'web');
    }

    public function test_logging_in_again_switches_to_the_new_account(): void
    {
        $this->account();
        $other = $this->account('Masvalaki');

        $this->login()->assertOk();
        $this->login('Masvalaki')->assertOk();

        $this->assertAuthenticatedAs($other, 'web');
    }

    /**
     * @param  array{string, string}  $credentials
     */
    #[DataProvider('wrongCredentials')]
    public function test_wrong_password_and_unknown_user_get_the_same_error(array $credentials): void
    {
        $this->account();

        $this->login(...$credentials)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username' => LoginController::INVALID_CREDENTIALS]);

        $this->assertGuest('web');
    }

    /**
     * @return array<string, array{array{string, string}}>
     */
    public static function wrongCredentials(): array
    {
        return [
            'wrong password' => [['PatrikT', 'rossz-jelszo']],
            'unknown user' => [['Senki', 'titkos-jelszo']],
        ];
    }

    #[DataProvider('malformedUsernames')]
    public function test_malformed_username_never_reaches_the_username_column(mixed $username): void
    {
        DB::connection('global')->enableQueryLog();

        $this->login($username)->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->assertNoQueryMentions('global', 'username', 'Non-ASCII input would make MySQL fail on the ascii username column.');
        $this->assertGuest('web');
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function malformedUsernames(): array
    {
        return [
            'accented' => ['őrült'],
            'too short' => ['ab'],
            'space inside' => ['Patrik T'],
            'array' => [['PatrikT']],
            'missing' => [null],
        ];
    }

    public function test_pattern_failure_gets_the_same_message_as_wrong_credentials(): void
    {
        $this->login('őrült')->assertJsonValidationErrors(['username' => LoginController::INVALID_CREDENTIALS]);
    }

    public function test_overlong_password_is_rejected_before_hashing(): void
    {
        $this->account();

        $this->login('PatrikT', str_repeat('a', 129))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_plugin_made_hash_logs_in(): void
    {
        $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertAuthenticated('web');
    }

    public function test_login_never_rewrites_the_plugin_hash(): void
    {
        $id = $this->pluginAccount();

        $this->login()->assertOk();

        $this->assertSame(self::PLUGIN_HASH, DB::connection('global')->table('accounts')->where('id', $id)->value('password_hash'));
    }

    public function test_login_from_outside_the_website_is_refused(): void
    {
        $this->account();

        $this->login(fromWebsite: false)
            ->assertForbidden()
            ->assertJson(['message' => 'A bejelentkezés csak a weboldalról lehetséges.']);

        $this->assertGuest('web');
    }

    public function test_login_is_limited_per_username_and_ip_from_config(): void
    {
        config(['rate_limits.login.per_minute' => 2]);
        $this->account();

        foreach (range(1, 2) as $attempt) {
            $this->login('PatrikT', 'rossz-jelszo')->assertUnprocessable();
        }

        $this->login('PatrikT', 'rossz-jelszo')->assertTooManyRequests();
        $this->login('Masvalaki', 'rossz-jelszo')->assertUnprocessable();
    }

    public function test_login_is_limited_per_ip_from_config(): void
    {
        config(['rate_limits.login.per_minute_per_ip' => 3]);

        foreach (['Elso', 'Masodik', 'Harmadik'] as $username) {
            $this->login($username, 'rossz-jelszo')->assertUnprocessable();
        }

        $this->login('Negyedik', 'rossz-jelszo')->assertTooManyRequests();
    }
}
```

- [ ] **Step 3: Futtasd, hogy elbukjon**

Run: `php artisan test --compact tests/Feature/LoginTest.php`
Expected: FAIL — `LoginController::INVALID_CREDENTIALS` nem létezik / 404 az `/api/auth/login`-ra.

- [ ] **Step 4: `Account` — bejelentkeztethető, közös névminta**

`app/Models/Account.php`: importok közé:

```php
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
```

az osztály fejléce:

```php
class Account extends Model implements AuthenticatableContract
{
    /** @use HasFactory<AccountFactory> */
    use Authenticatable, HasFactory;

    /**
     * Minecraft name rules: 3-16 ASCII letters, digits or underscores.
     */
    public const NAME_PATTERN = '/\A[A-Za-z0-9_]{3,16}\z/';
```

(a meglévő `use HasFactory;` sor helyére a fenti `use Authenticatable, HasFactory;` kerül.)

és a `casts()` metódus elé — metódusként, mert a trait `$authPasswordName` / `$rememberTokenName` property-jét a PHP nem engedi más alapértékkel újradeklarálni (fatal error):

```php
    /**
     * The password lives in PAxAuth's password_hash column.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * PAxAuth's accounts table has no remember token column, and "remember me" is not offered.
     */
    public function getRememberTokenName(): string
    {
        return '';
    }
```

`app/Http/Requests/RegisterRequest.php`: töröld a `private const DISPLAY_NAME_PATTERN = ...;` sort a docblokkjával, és a `rules()`-ban a `'regex:'.self::DISPLAY_NAME_PATTERN` helyett `'regex:'.Account::NAME_PATTERN` szerepeljen.

- [ ] **Step 5: `LoginRequest`**

`app/Http/Requests/LoginRequest.php` teljes tartalma:

```php
<?php

namespace App\Http\Requests;

use App\Http\Controllers\Auth\LoginController;
use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * bail + the name pattern run before any query: PAxAuth's username column
     * is ascii, and non-ASCII input would make MySQL fail. The password cap
     * keeps oversized input away from argon2.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => ['bail', 'required', 'string', 'regex:'.Account::NAME_PATTERN],
            'password' => ['required', 'string', 'max:128'],
        ];
    }

    /**
     * A malformed name gets the same answer as wrong credentials.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.regex' => LoginController::INVALID_CREDENTIALS,
        ];
    }
}
```

- [ ] **Step 6: `LoginController`**

`app/Http/Controllers/Auth/LoginController.php` teljes tartalma:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public const INVALID_CREDENTIALS = 'Hibás felhasználónév vagy jelszó.';

    /**
     * Log a player in with a Redis-backed session.
     *
     * Only website requests (Sanctum stateful origins) carry a session; anything
     * else is refused instead of failing on a missing session store.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        abort_unless($request->hasSession(), 403, 'A bejelentkezés csak a weboldalról lehetséges.');

        $credentials = [
            'username' => Account::usernameFor($request->validated('username')),
            'password' => $request->validated('password'),
        ];

        if (! Auth::guard('web')->attempt($credentials)) {
            throw ValidationException::withMessages(['username' => self::INVALID_CREDENTIALS]);
        }

        $request->session()->regenerate();

        return (new AccountResource(Auth::guard('web')->user()))->response();
    }
}
```

- [ ] **Step 7: Config — `sanctum.php`, `session.php`, `hashing.php`, `rate_limits.php`**

`config/sanctum.php` (új) teljes tartalma — a Sanctum csomag a saját configjába merge-eli:

```php
<?php

/*
 * Only the overrides; Sanctum merges the rest from its own config/sanctum.php.
 * Stateful domains come from config.yml (sanctum.stateful-domains -> SANCTUM_STATEFUL_DOMAINS).
 */
return [

    /*
     * The CSRF cookie route lives under /api: in production the proxy only
     * forwards /api to the backend (GET /api/sanctum/csrf-cookie).
     */
    'prefix' => 'api/sanctum',

];
```

`config/session.php` (új) teljes tartalma:

```php
<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/session.php
 * (lifetime, secure cookie, etc. come from config.yml's session section).
 */
return [

    /*
     * Sessions live in Redis and expire on their own after the lifetime of
     * inactivity. There is no sessions table, so the framework's "database"
     * default would fail.
     */
    'driver' => env('SESSION_DRIVER', 'redis'),

];
```

`config/hashing.php`: a záró `];` elé:

```php
    /*
     * Never rewrite a hash on login: the accounts table belongs to PAxAuth,
     * and logging in must not write to it.
     */
    'rehash_on_login' => false,
```

`config/rate_limits.php`: a `register_verify` blokk után:

```php
    /*
     * POST /api/auth/login: per username + IP (stops guessing one player's
     * password) and per IP overall. Never per username alone: Minecraft names
     * are public, so that would let anyone lock a player out.
     */
    'login' => [
        'per_minute' => (int) env('RATE_LIMITS_LOGIN_PER_MINUTE', 5),
        'per_minute_per_ip' => (int) env('RATE_LIMITS_LOGIN_PER_MINUTE_PER_IP', 20),
    ],
```

- [ ] **Step 8: `bootstrap/app.php` — stateful API és `login` limiter**

A `->withMiddleware(function (Middleware $middleware): void { // })` törzse:

```php
    ->withMiddleware(function (Middleware $middleware): void {
        // Website requests (Sanctum stateful origins) get the session and CSRF protection.
        $middleware->statefulApi();
    })
```

és a `->booted(...)` closure-be a meglévő limiterek után:

```php
        RateLimiter::for('login', function (Request $request): array {
            $username = $request->input('username');
            $usernameKey = is_string($username) ? mb_strtolower($username) : '';

            return [
                Limit::perMinute(config('rate_limits.login.per_minute'))->by('user:'.$usernameKey.'|'.$request->ip()),
                Limit::perMinute(config('rate_limits.login.per_minute_per_ip'))->by('ip:'.$request->ip()),
            ];
        });
```

- [ ] **Step 9: Route**

`routes/api.php`: az `auth` csoportba, a regisztrációs route-ok után (és az importokhoz `use App\Http\Controllers\Auth\LoginController;`):

```php
    Route::post('/login', LoginController::class)
        ->middleware('throttle:login')
        ->name('login');
```

- [ ] **Step 10: `phpunit.xml`**

A `RATE_LIMITS_REGISTRATION_MAIL_COOLDOWN_SECONDS` sor után:

```xml
        <env name="RATE_LIMITS_LOGIN_PER_MINUTE" value="5"/>
        <env name="RATE_LIMITS_LOGIN_PER_MINUTE_PER_IP" value="20"/>
        <env name="SANCTUM_STATEFUL_DOMAINS" value="localhost:5173"/>
```

- [ ] **Step 11: Futtasd a teszteket**

Run: `php artisan test --compact tests/Feature/LoginTest.php`
Expected: PASS.

Ha a `test_session_id_is_regenerated_on_login` a session-cookie kezelése miatt (nem a regenerálás hiánya miatt) bukik, a cél ugyanaz marad: bizonyítani, hogy a login után más a session-azonosító, mint előtte. Rögzítsd a ledgerben Rulingként, mit változtattál.

- [ ] **Step 12: Teljes suite és Pint**

Run: `php artisan test --compact && vendor/bin/pint --dirty --format agent`
Expected: minden PASS, Pint `passed`.

---

### Task 3: `/me`, logout, JSON 401, automatikus belépés beváltás után

**Files:**
- Create: `app/Http/Controllers/Auth/MeController.php`, `app/Http/Controllers/Auth/LogoutController.php`
- Modify: `app/Http/Controllers/Auth/VerifyRegistrationController.php`, `bootstrap/app.php`, `routes/api.php`
- Test: `tests/Feature/SessionTest.php`, `tests/Feature/VerifyRegistrationTest.php`

**Interfaces:**
- Consumes: `Account` mint `Authenticatable`, a `web` guard, `AccountResource`, `POST /api/auth/login` (Task 2).
- Produces: `GET /api/auth/me` (név `auth.me`) → 200 `AccountResource` / 401; `POST /api/auth/logout` (név `auth.logout`) → 204 / 401; a beváltás weboldalról bejelentkeztet.

- [ ] **Step 1: Generáld a fájlokat**

Run:

```bash
php artisan make:controller Auth/MeController --invokable --no-interaction
php artisan make:controller Auth/LogoutController --invokable --no-interaction
php artisan make:test SessionTest --phpunit --no-interaction
```

- [ ] **Step 2: Írd meg a teszteket**

`tests/Feature/SessionTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = 'http://localhost:5173';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function account(): Account
    {
        return Account::factory()->create(['display_name' => 'PatrikT', 'password_hash' => Hash::make('titkos-jelszo')]);
    }

    public function test_me_returns_the_logged_in_account(): void
    {
        $this->actingAs($this->account(), 'web')
            ->getJson('/api/auth/me', ['Origin' => self::FRONTEND])
            ->assertOk()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);
    }

    public function test_me_without_login_returns_401(): void
    {
        $this->getJson('/api/auth/me', ['Origin' => self::FRONTEND])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_me_without_accept_header_returns_401_not_500(): void
    {
        $this->get('/api/auth/me', ['Origin' => self::FRONTEND])->assertUnauthorized();
    }

    public function test_logout_ends_the_session(): void
    {
        $this->account();
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], ['Origin' => self::FRONTEND])->assertOk();

        $this->postJson('/api/auth/logout', [], ['Origin' => self::FRONTEND])->assertNoContent();

        $this->assertGuest('web');
        $this->getJson('/api/auth/me', ['Origin' => self::FRONTEND])->assertUnauthorized();
    }

    public function test_logout_without_login_returns_401(): void
    {
        $this->postJson('/api/auth/logout', [], ['Origin' => self::FRONTEND])->assertUnauthorized();
    }
}
```

`tests/Feature/VerifyRegistrationTest.php`: a `test_valid_code_creates_the_account` után:

```php
    public function test_verifying_from_the_website_logs_the_player_in(): void
    {
        $this->pending();

        $this->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => '123456'], ['Origin' => 'http://localhost:5173'])
            ->assertCreated();

        $this->assertAuthenticatedAs(Account::query()->sole(), 'web');
    }

    public function test_verifying_from_outside_the_website_creates_the_account_without_login(): void
    {
        $this->pending();

        $this->verify('123456')->assertCreated();

        $this->assertSame(1, Account::query()->count());
        $this->assertGuest('web');
    }
```

- [ ] **Step 3: Futtasd, hogy elbukjanak**

Run: `php artisan test --compact tests/Feature/SessionTest.php tests/Feature/VerifyRegistrationTest.php`
Expected: FAIL — 404 a `/me`/`/logout`-ra, és a weboldalas beváltás után nincs bejelentkezés.

- [ ] **Step 4: Controllerek**

`app/Http/Controllers/Auth/MeController.php` teljes tartalma:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * The logged-in player's account.
     */
    public function __invoke(Request $request): AccountResource
    {
        return new AccountResource($request->user());
    }
}
```

`app/Http/Controllers/Auth/LogoutController.php` teljes tartalma:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    /**
     * Log out and delete the session: its Redis key is removed and a fresh CSRF token issued.
     */
    public function __invoke(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
```

`app/Http/Controllers/Auth/VerifyRegistrationController.php` `__invoke` törzse (az importokhoz `use Illuminate\Support\Facades\Auth;`):

```php
        $account = $verifyRegistration->handle(
            $request->validated('email'),
            $request->validated('code'),
        );

        // Log the player in only after the account transaction has committed,
        // and only for website requests (which carry a session).
        if ($request->hasSession()) {
            Auth::guard('web')->login($account);
            $request->session()->regenerate();
        }

        return (new AccountResource($account))->response()->setStatusCode(201);
```

és a docblock: `Redeem the emailed code, create the PAxAuth account and, from the website, log the player in.`

- [ ] **Step 5: Route-ok és JSON 401**

`routes/api.php`: az `auth` csoportba (importok: `use App\Http\Controllers\Auth\LogoutController;`, `use App\Http\Controllers\Auth\MeController;`):

```php
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', MeController::class)->name('me');
        Route::post('/logout', LogoutController::class)->name('logout');
    });
```

`bootstrap/app.php` `withMiddleware` törzse:

```php
    ->withMiddleware(function (Middleware $middleware): void {
        // Website requests (Sanctum stateful origins) get the session and CSRF protection.
        $middleware->statefulApi();

        // An API has no login page: guests get a JSON 401, never a redirect.
        $middleware->redirectGuestsTo(fn () => null);
    })
```

- [ ] **Step 6: Futtasd a teszteket**

Run: `php artisan test --compact tests/Feature/SessionTest.php tests/Feature/VerifyRegistrationTest.php`
Expected: PASS.

- [ ] **Step 7: Teljes suite és Pint**

Run: `php artisan test --compact && vendor/bin/pint --dirty --format agent`
Expected: minden PASS, Pint `passed`.

---

### Task 4: Redis-kiesés, trusted proxies, config minta

**Files:**
- Create: `config/trustedproxy.php`
- Modify: `bootstrap/app.php`, `phpunit.xml`, `config.example.yml`
- Test: `tests/Feature/RedisOutageTest.php`, `tests/Feature/TrustedProxiesTest.php`

**Interfaces:**
- Consumes: `POST /api/auth/login` és a `login` limiter (Task 2).
- Produces: `RedisException` → 500 `{"message": "Váratlan hiba történt."}` (riportolva); `trustedproxy.proxies` config (`TRUSTED_PROXIES`, vesszős lista).

- [ ] **Step 1: Generáld a teszteket**

Run:

```bash
php artisan make:test RedisOutageTest --phpunit --no-interaction
php artisan make:test TrustedProxiesTest --phpunit --no-interaction
```

- [ ] **Step 2: Írd meg a teszteket**

`tests/Feature/RedisOutageTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Exceptions;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use RedisException;
use Tests\TestCase;

#[RequiresPhpExtension('redis')]
class RedisOutageTest extends TestCase
{
    public function test_unreachable_redis_gives_a_generic_500(): void
    {
        Exceptions::fake();
        config([
            'session.driver' => 'redis',
            'database.redis.default.host' => '127.0.0.1',
            'database.redis.default.port' => 1,
        ]);

        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], ['Origin' => 'http://localhost:5173'])
            ->assertInternalServerError()
            ->assertExactJson(['message' => 'Váratlan hiba történt.']);

        Exceptions::assertReported(RedisException::class);
    }
}
```

`tests/Feature/TrustedProxiesTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TrustedProxiesTest extends TestCase
{
    /**
     * A wrong login through the per-IP limiter, as if forwarded by Cloudflare Tunnel.
     *
     * @param  array<string, string>  $server
     */
    private function loginVia(string $forwardedFor, array $server = []): TestResponse
    {
        return $this->withServerVariables($server)->postJson(
            '/api/auth/login',
            ['username' => 'Senki'.random_int(100, 999), 'password' => 'rossz-jelszo'],
            ['Origin' => 'http://localhost:5173', 'X-Forwarded-For' => $forwardedFor],
        );
    }

    public function test_client_ip_comes_from_the_trusted_tunnel(): void
    {
        $this->createAccountsTable();
        config(['rate_limits.login.per_minute_per_ip' => 1]);

        $this->loginVia('203.0.113.1')->assertUnprocessable();
        $this->loginVia('203.0.113.1')->assertTooManyRequests();
        $this->loginVia('203.0.113.2')->assertUnprocessable();
    }

    public function test_untrusted_sender_cannot_choose_its_ip(): void
    {
        $this->createAccountsTable();
        config(['rate_limits.login.per_minute_per_ip' => 1]);
        $untrusted = ['REMOTE_ADDR' => '198.51.100.7'];

        $this->loginVia('203.0.113.1', $untrusted)->assertUnprocessable();
        $this->loginVia('203.0.113.2', $untrusted)->assertTooManyRequests();
    }

    public function test_forwarded_host_from_the_tunnel_is_not_trusted(): void
    {
        Route::get('/api/test-host', fn (Request $request) => $request->getHost());

        $this->get('/api/test-host', ['X-Forwarded-Host' => 'evil.example'])->assertSeeText('localhost');
    }
}
```

- [ ] **Step 3: Futtasd, hogy elbukjanak**

Run: `php artisan test --compact tests/Feature/RedisOutageTest.php tests/Feature/TrustedProxiesTest.php`
Expected: FAIL — a Redis-teszt Laravel alap „Server Error” üzenetet kap; a `test_client_ip_comes_from_the_trusted_tunnel` harmadik kérése 429 (mert nincs trusted proxy, minden kérés ugyanaz az IP). (A `test_untrusted_sender_cannot_choose_its_ip` és a `test_forwarded_host...` már most is zöld lehet — ezek regressziós őrök.)

- [ ] **Step 4: Implementáció**

`config/trustedproxy.php` (új) teljes tartalma:

```php
<?php

/*
 * Proxies whose X-Forwarded-For / X-Forwarded-Proto headers are trusted, from
 * config.yml's trusted-proxies list (TRUSTED_PROXIES, comma-separated).
 * In production this is the Cloudflare Tunnel's cloudflared, which forwards
 * every request from 127.0.0.1 (or the Docker bridge gateway if the backend
 * runs in a container).
 */
return [

    'proxies' => env('TRUSTED_PROXIES'),

];
```

`bootstrap/app.php`: `withMiddleware` törzsébe a `redirectGuestsTo` után:

```php
        // Only the client IP and the original scheme are taken from the proxy;
        // X-Forwarded-Host/Port/Prefix stay untrusted, so a client cannot change url().
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO);
```

és a `withExceptions` törzsébe a `shouldRenderJsonWhen` után:

```php
        // Sessions live in Redis; when it is down, players get a plain message
        // (the exception is still reported to the log).
        $exceptions->render(fn (RedisException $exception) => response()->json(['message' => 'Váratlan hiba történt.'], 500));
```

az importok közé: `use RedisException;`.

`phpunit.xml`: a `SANCTUM_STATEFUL_DOMAINS` sor után:

```xml
        <env name="TRUSTED_PROXIES" value="127.0.0.1"/>
```

`config.example.yml`: az `app:` blokk után:

```yaml
redis:
  host: 127.0.0.1
  port: 6379
  password: ""
  # Only sessions use this index. The Redis instance is shared (Pterodactyl,
  # LuckPerms, ...): pick an index nothing else uses, and never share it with
  # a cache store (cache:clear flushes the whole index).
  db: 3

session:
  driver: redis
  lifetime: 120         # minutes of inactivity before the login expires
  secure-cookie: false  # true in production (HTTPS)

sanctum:
  # Website origins that get session login and CSRF protection.
  stateful-domains:
    - localhost:5173
    # production: center.runeempire.net

# Proxies whose X-Forwarded-For / -Proto is trusted (Cloudflare Tunnel's cloudflared).
# If the backend runs in Docker, this is the bridge gateway (e.g. 172.18.0.1), not 127.0.0.1.
trusted-proxies:
  - 127.0.0.1
```

és a `rate-limits:` blokkba a `registration-mail` után:

```yaml
  login:                # POST /api/auth/login
    per-minute: 5       # per username + IP
    per-minute-per-ip: 20
```

- [ ] **Step 5: Futtasd a teszteket, a teljes suite-ot és a Pintet**

Run:

```bash
php artisan test --compact tests/Feature/RedisOutageTest.php tests/Feature/TrustedProxiesTest.php
php artisan test --compact
vendor/bin/pint --dirty --format agent
php artisan route:list --except-vendor
```

Expected: minden PASS; Pint `passed`; a route-lista tartalmazza: `GET api/auth/me`, `POST api/auth/login`, `POST api/auth/logout`, `POST api/auth/register`, `POST api/auth/register/verify`, `GET api/sanctum/csrf-cookie`.

- [ ] **Step 6: Kézi ellenőrzés a felhasználóval (CSRF és Redis TTL)**

A felhasználó a saját `config.yml`-jébe átmásolja a `redis`, `session`, `sanctum`, `trusted-proxies` blokkot (és a `rate-limits.login`-t), majd `php artisan serve` mellett Postmanben, minden kérésnél `Origin: http://localhost:5173` és `Accept: application/json` headerrel:

1. `GET http://localhost:8000/api/sanctum/csrf-cookie` → 204, `XSRF-TOKEN` cookie.
2. `POST /api/auth/login` `X-XSRF-TOKEN` headerrel (az `XSRF-TOKEN` cookie URL-dekódolt értéke) → 200; token nélkül → 419.
3. `GET /api/auth/me` → 200.
4. Közben `docker exec redis-dev redis-cli -n 3 KEYS '*'` → egy session-kulcs; `TTL <kulcs>` ≈ 7200, és egy újabb `/me` után újra ≈ 7200 (csúszó lejárat).
5. `POST /api/auth/logout` → 204, és a kulcs eltűnik a Redisből; a `/me` → 401.
