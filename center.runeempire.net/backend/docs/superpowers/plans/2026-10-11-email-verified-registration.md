# E-mailben megerősített regisztráció — megvalósítási terv

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `POST /api/register` csak egy függő regisztrációt hoz létre és kódot küld e-mailben; a fiók a `POST /api/register/verify` sikeres kódbeváltásakor jön létre a PAxAuth `accounts` táblájában.

**Architecture:** Két új action (`StartRegistration`, `VerifyRegistration`) a meglévő `RegisterAccount` mellé, egy `PendingRegistration` modell az auth (`global`) DB-ben saját migrációval, a kód generálása/hash-elése egy `RegistrationCode` support osztályban, a levél egy view nélküli Notification. A `user:register` parancs és az API ugyanazt a `RegisterRequest::normalize()` + `rules()` validációt használja.

**Tech Stack:** Laravel 13.34, PHP 8.4, PHPUnit 12, SQLite in-memory a tesztekben (`default` és `global` kapcsolat is), MySQL élesben, Brevo SMTP.

**Spec:** `docs/superpowers/specs/2026-10-11-email-verified-registration-design.md`

## Global Constraints

- Minden parancs a `center.runeempire.net/backend` mappából fut.
- **Nem commitolunk** (projektszabály: a felhasználó commitol). A „Commit” lépések helyén mindenhol csak a Pint fut.
- Minden PHP módosítás után: `vendor/bin/pint --dirty --format agent`.
- Új fájlokat `php artisan make:* --no-interaction`-nel hozunk létre, utána felülírjuk a tartalmukat.
- Új composer/npm függőség nem kerülhet be.
- Kód, azonosítók, kommentek angolul; a felhasználónak szóló saját hibaüzenetek és a levél magyarul (a Laravel beépített validációs üzenetei angolok maradnak).
- Az `accounts` tábla sémáját a PAxAuth plugin birtokolja: migrációt rá nem írunk, a tesztek a `TestCase::createAccountsTable()`-lel építik fel.
- A `config.yml` (gitignored, a felhasználó helyi fájlja) tartalmát nem írjuk felül; csak a `config.example.yml` változik.
- Konfig értékek (szó szerint a specből): kódhossz `6`, lejárat `15` perc, max próbálkozás `5`, levél-cooldown `60` mp / e-mail, register limit `5`/perc/IP és `20`/óra/IP, verify limit `10`/perc, SMTP timeout `10` mp.

## Review Focus

1. **Kis-/nagybetűs vagy szóközös e-mail a beváltásnál** (` Patrik@Example.com `) — ugyanazt a függő regisztrációt kell megtalálnia. → Task 4, `test_email_is_matched_after_normalization`.
2. **A kód JSON számként érkezik** (`"code": 12345`, a vezető nulla elveszett) — 422, nem 500, és nem számít próbálkozásnak. → Task 4, `invalidCodes` adatkészlet.
3. **A Brevo nem érhető el** — 503, nem marad függő sor, és a felhasználó azonnal újrapróbálhatja (a cooldown nem indul el). → Task 3, `test_mail_failure_returns_503_and_keeps_nothing`.
4. **Újraregisztráció után a régi kóddal próbálkozik** — 422, csak az új kód működik. → Task 4, `test_only_the_latest_code_works_after_re_registering`.
5. **Egy lejárt, régi függő regisztráció ugyanarra az e-mailre** — az új regisztráció zavartalanul létrejön, a lejárt sor eltűnik. → Task 3, `test_expired_pending_registrations_are_cleaned_up`.

---

### Task 1: Az e-mail kötelező és a fiókba kerül (az API még azonnal létrehoz)

Ez a lépés még nem vezet be függő regisztrációt: a meglévő folyamat bővül az e-maillel,
hogy a parancs és az API validációja már a végleges legyen.

**Files:**
- Modify: `app/Models/Account.php`
- Modify: `app/Http/Requests/RegisterRequest.php`
- Modify: `app/Actions/RegisterAccount.php`
- Modify: `app/Http/Controllers/Auth/RegisterController.php`
- Modify: `app/Console/Commands/RegisterUser.php`
- Modify: `database/factories/AccountFactory.php`
- Modify: `tests/TestCase.php`
- Test: `tests/Feature/RegisterTest.php`, `tests/Feature/RegisterUserCommandTest.php`

**Interfaces:**
- Produces:
  - `Account::normalizeEmail(string $email): string` — trim + `mb_strtolower`.
  - `RegisterRequest::normalize(array $input): array` — lecseréli a `withUsername()`-t; hozzáadja a `username`-et (ha a név érvényes) és normalizálja az `email`-t (ha string).
  - `RegisterRequest::rules()` — új `email` szabály: `['required', 'string', 'email', 'max:255', Rule::unique(Account::class, 'email')]`.
  - `RegisterAccount::handle(string $displayName, string $email, string $password): Account` — a `$password` lehet sima jelszó vagy kész argon2id hash (a `hashed` cast a hash-t változatlanul hagyja).
  - `TestCase::assertNoQueryMentions(string $connection, string $column, string $message = ''): void`.
  - `Account` fillable: `uuid, username, display_name, password_hash, email`.

- [ ] **Step 1: A teszt-segéd a `TestCase`-be**

`tests/TestCase.php` teljes tartalma:

```php
<?php

namespace Tests;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    /**
     * The accounts table belongs to the PAxAuth plugin, so there is no migration
     * for it here; tests rebuild its relevant columns on the in-memory
     * "global" connection.
     */
    protected function createAccountsTable(): void
    {
        Schema::connection('global')->create('accounts', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('username', 16)->unique();
            $table->string('display_name', 16)->default('');
            $table->string('password_hash');
            $table->string('email')->nullable();
            $table->string('registered_ip', 45)->default('0.0.0.0');
            $table->dateTime('created_at')->useCurrent();
        });
    }

    /**
     * Assert that no query logged on the connection mentioned the column.
     * The connection's query log must have been enabled by the test.
     */
    protected function assertNoQueryMentions(string $connection, string $column, string $message = ''): void
    {
        $queries = array_filter(
            DB::connection($connection)->getQueryLog(),
            fn (array $query): bool => str_contains($query['query'], $column),
        );

        $this->assertSame([], array_values($queries), $message);
    }
}
```

- [ ] **Step 2: A `RegisterTest` e-maillel bővítve (még azonnali fiókkal)**

`tests/Feature/RegisterTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    public function test_player_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => ' Patrik@Example.com ',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ]);

        $response->assertCreated()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $account = Account::query()->where('username', 'patrikt')->sole();
        $this->assertSame('patrik@example.com', $account->email);
        $this->assertSame('0.0.0.0', $account->registered_ip, 'registered_ip is left for PAxAuth to record on the first join.');
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
    }

    public function test_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->postJson('/api/register', [
            'display_name' => 'PATRIKT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->assertSame(1, Account::query()->count());
    }

    public function test_email_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => 'Patrik@EXAMPLE.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(1, Account::query()->count());
    }

    #[DataProvider('invalidEmails')]
    public function test_email_must_be_valid(mixed $email): void
    {
        $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => $email,
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(0, Account::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidEmails(): array
    {
        return [
            'missing' => [null],
            'not an email' => ['nem-email'],
            'too long' => [str_repeat('a', 251).'@x.hu'],
            'array' => [['patrik@example.com']],
        ];
    }

    #[DataProvider('invalidDisplayNames')]
    public function test_display_name_must_follow_minecraft_rules(mixed $displayName): void
    {
        DB::connection('global')->enableQueryLog();

        $this->postJson('/api/register', [
            'display_name' => $displayName,
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ])->assertUnprocessable()->assertJsonValidationErrors('display_name');

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertSame(0, Account::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidDisplayNames(): array
    {
        return [
            'missing' => [null],
            'too short' => ['ab'],
            'too long' => ['abcdefghijklmnopq'],
            'space' => ['Patrik T'],
            'hyphen' => ['Patrik-T'],
            'accented letter' => ['Patrík'],
            'newline' => ["Patrik\nT"],
            'array' => [['PatrikT']],
        ];
    }

    #[DataProvider('invalidPasswords')]
    public function test_password_must_be_valid(string $password, string $confirmation): void
    {
        $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => $password,
            'password_confirmation' => $confirmation,
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame(0, Account::query()->count());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function invalidPasswords(): array
    {
        return [
            'too short' => ['1234567', '1234567'],
            'too long' => [str_repeat('a', 65), str_repeat('a', 65)],
            'confirmation mismatch' => ['titkos-jelszo', 'masik-jelszo'],
        ];
    }

    public function test_frontend_origin_passes_cors_preflight(): void
    {
        $this->options('/api/register', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        $foreignOrigin = $this->options('/api/register', [], [
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'POST',
        ]);

        $this->assertNotSame('https://evil.example', $foreignOrigin->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_registration_is_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }
}
```

- [ ] **Step 3: A `RegisterUserCommandTest` e-maillel**

`tests/Feature/RegisterUserCommandTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegisterUserCommandTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->createAccountsTable();
    }

    public function test_registers_account_from_arguments_without_mailing(): void
    {
        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'Patrik@Example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('User [PatrikT] registered.')
            ->assertSuccessful();

        $account = Account::query()->where('username', 'patrikt')->sole();
        $this->assertSame('70404374-69da-35c1-82bc-fcf925aa903a', $account->uuid);
        $this->assertSame('PatrikT', $account->display_name);
        $this->assertSame('patrik@example.com', $account->email);
        $this->assertSame('0.0.0.0', $account->registered_ip);
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
        Notification::assertNothingSent();
    }

    public function test_asks_for_missing_values(): void
    {
        $this->artisan('user:register')
            ->expectsQuestion('Username', 'PatrikT')
            ->expectsQuestion('Email', 'patrik@example.com')
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'titkos-jelszo')
            ->assertSuccessful();

        $account = Account::query()->sole();
        $this->assertSame('patrik@example.com', $account->email);
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
    }

    public function test_fails_when_confirmation_does_not_match(): void
    {
        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'patrik@example.com'])
            ->expectsQuestion('Password', 'titkos-jelszo')
            ->expectsQuestion('Confirm password', 'masik-jelszo')
            ->assertFailed();

        $this->assertSame(0, Account::query()->count());
    }

    public function test_fails_when_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->artisan('user:register', ['username' => 'PATRIKT', 'email' => 'patrik@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('username has already been taken')
            ->assertFailed();

        $this->assertSame(1, Account::query()->count());
    }

    public function test_fails_when_email_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->artisan('user:register', ['username' => 'PatrikT', 'email' => 'PATRIK@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The email has already been taken.')
            ->assertFailed();

        $this->assertSame(1, Account::query()->count());
    }

    public function test_fails_on_invalid_name_without_querying_usernames(): void
    {
        DB::connection('global')->enableQueryLog();

        $this->artisan('user:register', ['username' => 'Patrík', 'email' => 'patrik@example.com', '--password' => 'titkos-jelszo'])
            ->expectsOutputToContain('The username field format is invalid.')
            ->assertFailed();

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
    }
}
```

- [ ] **Step 4: Futtasd, hogy elbukjanak**

Run: `php artisan test --compact tests/Feature/RegisterTest.php tests/Feature/RegisterUserCommandTest.php`
Expected: FAIL — pl. `test_email_is_taken_regardless_of_case` (nincs e-mail szabály), `test_registers_account_from_arguments_without_mailing` (nincs `email` argumentum), `test_player_can_register` (`email` null).

- [ ] **Step 5: `Account` — e-mail normalizálás és fillable**

`app/Models/Account.php`: a `#[Fillable(...)]` sor:

```php
#[Fillable(['uuid', 'username', 'display_name', 'password_hash', 'email'])]
```

és a `usernameFor()` metódus után:

```php
    /**
     * Emails are stored and compared trimmed and lowercased, so one address
     * cannot back two accounts through different casing.
     */
    public static function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }
```

- [ ] **Step 6: `RegisterRequest` — `normalize()` és e-mail szabály**

`app/Http/Requests/RegisterRequest.php`: cseréld a `prepareForValidation()` és a `withUsername()` metódust erre:

```php
    /**
     * The lowercase username is derived from the display name, so the
     * uniqueness check is case-insensitive like the plugin's lookups.
     * Invalid names are not merged: the unique query must never send
     * non-ASCII input to PAxAuth's ascii username column.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(Arr::only(self::normalize($this->all()), ['username', 'email']));
    }

    /**
     * Normalize raw registration input (derived username, trimmed lowercase
     * email), so callers outside HTTP (the user:register command) validate
     * exactly like the endpoint.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalize(array $input): array
    {
        $displayName = $input['display_name'] ?? null;

        if (is_string($displayName) && preg_match(self::DISPLAY_NAME_PATTERN, $displayName)) {
            $input['username'] = Account::usernameFor($displayName);
        }

        if (is_string($input['email'] ?? null)) {
            $input['email'] = Account::normalizeEmail($input['email']);
        }

        return $input;
    }
```

és a `rules()` tömbbe a `username` után:

```php
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(Account::class, 'email')],
```

- [ ] **Step 7: `RegisterAccount` — e-mail paraméter**

`app/Actions/RegisterAccount.php` teljes tartalma:

```php
<?php

namespace App\Actions;

use App\Models\Account;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class RegisterAccount
{
    /**
     * Create a player account in the PAxAuth accounts table from already validated input.
     *
     * registered_ip is left to the plugin, which records it on the first join.
     * $password may be a plain password or the argon2id hash of a pending
     * registration: the model's hashed cast keeps an existing hash as is.
     *
     * @throws ValidationException when the name was taken between validation and insert
     */
    public function handle(string $displayName, string $email, string $password): Account
    {
        try {
            return Account::create([
                'uuid' => Account::offlineUuid($displayName),
                'username' => Account::usernameFor($displayName),
                'display_name' => $displayName,
                'password_hash' => $password,
                'email' => $email,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'username' => __('validation.unique', ['attribute' => 'username']),
            ]);
        }
    }
}
```

- [ ] **Step 8: `RegisterController` — e-mail továbbadása (átmeneti, Task 3 lecseréli)**

`app/Http/Controllers/Auth/RegisterController.php` `__invoke` törzse:

```php
        $account = $registerAccount->handle(
            $request->validated('display_name'),
            $request->validated('email'),
            $request->validated('password'),
        );

        return (new AccountResource($account))->response()->setStatusCode(201);
```

- [ ] **Step 9: `user:register` — e-mail argumentum**

`app/Console/Commands/RegisterUser.php` teljes tartalma:

```php
<?php

namespace App\Console\Commands;

use App\Actions\RegisterAccount;
use App\Http\Requests\RegisterRequest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

#[Signature('user:register {username?} {email?} {--password=}')]
#[Description('Register a new user')]
class RegisterUser extends Command
{
    /**
     * Execute the console command.
     *
     * Admin tool: the account is created immediately, without an email code.
     */
    public function handle(RegisterAccount $registerAccount): int
    {
        $username = $this->argument('username') ?? $this->ask('Username');
        $email = $this->argument('email') ?? $this->ask('Email');
        $password = $this->option('password');
        $confirmation = $password;

        if ($password === null) {
            $password = $this->secret('Password');
            $confirmation = $this->secret('Confirm password');
        }

        $validator = Validator::make(
            RegisterRequest::normalize([
                'display_name' => $username,
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $confirmation,
            ]),
            (new RegisterRequest)->rules(),
            attributes: ['display_name' => 'username'],
        );

        try {
            $validated = $validator->validate();
            $account = $registerAccount->handle($validated['display_name'], $validated['email'], $validated['password']);
        } catch (ValidationException $exception) {
            foreach (Arr::flatten($exception->errors()) as $message) {
                $this->components->error($message);
            }

            return self::FAILURE;
        }

        $this->components->info("User [{$account->display_name}] registered.");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 10: `AccountFactory` — e-mail**

`database/factories/AccountFactory.php` `definition()` tömbjébe a `password_hash` után:

```php
            'email' => fake()->unique()->safeEmail(),
```

- [ ] **Step 11: Futtasd a teljes suite-ot**

Run: `php artisan test --compact`
Expected: PASS (minden teszt).

- [ ] **Step 12: Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: `{"tool":"pint","result":"passed"}` (vagy javított fájlok listája; ilyenkor futtasd újra a teszteket).

---

### Task 2: Függő regisztráció tárolása, kód, levél, config

**Files:**
- Create: `database/migrations/<timestamp>_create_pending_registrations_table.php`
- Create: `app/Models/PendingRegistration.php`
- Create: `database/factories/PendingRegistrationFactory.php`
- Create: `app/Support/RegistrationCode.php`
- Create: `app/Notifications/RegistrationCodeNotification.php`
- Create: `config/mail.php`
- Modify: `config/auth.php`
- Modify: `phpunit.xml`
- Modify: `config.example.yml`
- Test: `tests/Feature/PendingRegistrationsMigrationTest.php`, `tests/Feature/RegistrationCodeTest.php`, `tests/Feature/RegistrationCodeNotificationTest.php`

**Interfaces:**
- Consumes: `Account::usernameFor(string): string` (meglévő).
- Produces:
  - `App\Models\PendingRegistration` (kapcsolat: `global`; mezők: `id`, `username`, `display_name`, `email`, `password_hash`, `code_hash`, `attempts` (int), `expires_at` (Carbon), `created_at`; nincs `updated_at`; `HasFactory`).
  - `PendingRegistrationFactory` állapotok: `expired(): static`, `withCode(string $code): static`; alapból a kód `123456`, a jelszó `password`, a lejárat +15 perc.
  - `RegistrationCode::generate(): string`, `RegistrationCode::hash(string $code): string`, `RegistrationCode::matches(string $code, string $hash): bool`.
  - `new RegistrationCodeNotification(string $code, int $expiresInMinutes)` — publikus readonly `$code`, `$expiresInMinutes`; csatorna: `mail`.
  - Config: `auth.registration_code.length` (int), `auth.registration_code.expires_minutes` (int), `auth.registration_code.max_attempts` (int); `mail.mailers.smtp.timeout = 10`.

- [ ] **Step 1: Generáld a fájlokat**

Run:

```bash
php artisan make:migration create_pending_registrations_table --no-interaction
php artisan make:model PendingRegistration --factory --no-interaction
php artisan make:class Support/RegistrationCode --no-interaction
php artisan make:notification RegistrationCodeNotification --no-interaction
php artisan make:test PendingRegistrationsMigrationTest --phpunit --no-interaction
php artisan make:test RegistrationCodeTest --phpunit --no-interaction
php artisan make:test RegistrationCodeNotificationTest --phpunit --no-interaction
```

Expected: mind `created successfully`.

- [ ] **Step 2: Írd meg a teszteket**

`tests/Feature/PendingRegistrationsMigrationTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PendingRegistrationsMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_table_is_created_on_the_auth_connection(): void
    {
        $this->assertTrue(Schema::connection('global')->hasTable('pending_registrations'));
        $this->assertFalse(Schema::hasTable('pending_registrations'), 'The web database must not get the table.');
    }

    public function test_running_again_against_an_existing_table_is_a_no_op(): void
    {
        /** @var Migration $migration */
        $migration = require collect(glob(database_path('migrations/*_create_pending_registrations_table.php')))->sole();

        $migration->up();

        $this->assertTrue(Schema::connection('global')->hasTable('pending_registrations'));
    }
}
```

`tests/Feature/RegistrationCodeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Support\RegistrationCode;
use Tests\TestCase;

class RegistrationCodeTest extends TestCase
{
    public function test_generates_the_configured_number_of_digits(): void
    {
        config(['auth.registration_code.length' => 8]);

        $this->assertMatchesRegularExpression('/\A\d{8}\z/', RegistrationCode::generate());
    }

    public function test_hash_matches_only_the_same_code(): void
    {
        $hash = RegistrationCode::hash('012345');

        $this->assertSame(64, strlen($hash));
        $this->assertTrue(RegistrationCode::matches('012345', $hash));
        $this->assertFalse(RegistrationCode::matches('12345', $hash), 'Leading zeros are part of the code.');
        $this->assertFalse(RegistrationCode::matches('012346', $hash));
    }
}
```

`tests/Feature/RegistrationCodeNotificationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Notifications\RegistrationCodeNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class RegistrationCodeNotificationTest extends TestCase
{
    /**
     * Notification::fake() never renders the mail, and the app has no
     * resources/ folder, so rendering is pinned here.
     */
    public function test_mail_renders_the_code_and_expiry(): void
    {
        $mail = (new RegistrationCodeNotification('012345', 15))->toMail(new AnonymousNotifiable);

        $html = (string) $mail->render();

        $this->assertSame('RuneEmpire regisztrációs kód', $mail->subject);
        $this->assertStringContainsString('012345', $html);
        $this->assertStringContainsString('15 percig', $html);
    }
}
```

- [ ] **Step 3: Futtasd, hogy elbukjanak**

Run: `php artisan test --compact tests/Feature/PendingRegistrationsMigrationTest.php tests/Feature/RegistrationCodeTest.php tests/Feature/RegistrationCodeNotificationTest.php`
Expected: FAIL (üres migráció, `RegistrationCode::generate` nem létezik, a notification nem a várt levelet adja).

- [ ] **Step 4: Migráció**

A létrehozott `database/migrations/<timestamp>_create_pending_registrations_table.php` teljes tartalma:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pending registrations live in the auth database, next to PAxAuth's accounts.
     */
    protected $connection = 'global';

    /**
     * Run the migrations.
     *
     * Guarded with hasTable: the migrations log is kept in the default (web)
     * database, so a new or moved web database runs this again against an
     * auth database that already has the table.
     */
    public function up(): void
    {
        $schema = Schema::connection($this->getConnection());

        if ($schema->hasTable('pending_registrations')) {
            return;
        }

        $schema->create('pending_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('username', 16)->charset('ascii')->unique();
            $table->string('display_name', 16)->charset('ascii');
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->char('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('expires_at')->index();
            $table->dateTime('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('pending_registrations');
    }
};
```

- [ ] **Step 5: Modell**

`app/Models/PendingRegistration.php` teljes tartalma:

```php
<?php

namespace App\Models;

use Database\Factories\PendingRegistrationFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A registration waiting for its emailed code, in the auth database.
 * It becomes an Account when the code is redeemed.
 */
#[Connection('global')]
#[Fillable(['username', 'display_name', 'email', 'password_hash', 'code_hash', 'expires_at'])]
#[Hidden(['password_hash', 'code_hash'])]
class PendingRegistration extends Model
{
    /** @use HasFactory<PendingRegistrationFactory> */
    use HasFactory;

    /**
     * Rows are replaced, never updated in place, so there is no updated_at.
     */
    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
        ];
    }
}
```

- [ ] **Step 6: Factory**

`database/factories/PendingRegistrationFactory.php` teljes tartalma:

```php
<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Support\RegistrationCode;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<PendingRegistration>
 */
class PendingRegistrationFactory extends Factory
{
    /**
     * The current password hash being used by the factory.
     */
    protected static ?string $passwordHash;

    /**
     * Define the model's default state. The code is 123456 and the password is "password".
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => fn (array $attributes) => Account::usernameFor($attributes['display_name']),
            'display_name' => fake()->unique()->regexify('[A-Za-z][A-Za-z0-9_]{2,15}'),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => static::$passwordHash ??= Hash::make('password'),
            'code_hash' => RegistrationCode::hash('123456'),
            'expires_at' => now()->addMinutes(15),
        ];
    }

    /**
     * Indicate that the code has already expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subMinute(),
        ]);
    }

    /**
     * Indicate the code that was mailed for this registration.
     */
    public function withCode(string $code): static
    {
        return $this->state(fn (array $attributes) => [
            'code_hash' => RegistrationCode::hash($code),
        ]);
    }
}
```

- [ ] **Step 7: `RegistrationCode`**

`app/Support/RegistrationCode.php` teljes tartalma:

```php
<?php

namespace App\Support;

/**
 * The numeric code emailed to confirm a registration.
 *
 * Only a keyed hash is stored. A fast HMAC is enough: guessing is bounded by
 * the per-registration attempt limit and the verify rate limit, and argon2
 * would cost 128 MB of memory per check.
 */
class RegistrationCode
{
    /**
     * A random code of the configured number of digits; leading zeros are kept.
     */
    public static function generate(): string
    {
        $code = '';

        for ($digit = 0; $digit < config('auth.registration_code.length'); $digit++) {
            $code .= random_int(0, 9);
        }

        return $code;
    }

    /**
     * The value stored in place of the code (64 hex characters).
     */
    public static function hash(string $code): string
    {
        return hash_hmac('sha256', $code, config('app.key'));
    }

    /**
     * Compare a submitted code with a stored hash in constant time.
     */
    public static function matches(string $code, string $hash): bool
    {
        return hash_equals($hash, self::hash($code));
    }
}
```

- [ ] **Step 8: Notification**

`app/Notifications/RegistrationCodeNotification.php` teljes tartalma:

```php
<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Mails the registration code. Not queued: the registration request reports
 * a sending failure to the player right away.
 */
class RegistrationCodeNotification extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly string $code,
        public readonly int $expiresInMinutes,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('RuneEmpire regisztrációs kód')
            ->greeting('Szia!')
            ->line("A regisztrációs kódod: **{$this->code}**")
            ->line("A kód {$this->expiresInMinutes} percig érvényes.")
            ->line('Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.')
            ->salutation('RuneEmpire');
    }
}
```

- [ ] **Step 9: Config — `auth.php`, `mail.php`, `phpunit.xml`, `config.example.yml`**

`config/auth.php`: a `password_length` blokk után, a záró `];` elé:

```php
    /*
     * The emailed code that confirms a registration before the account is created.
     */
    'registration_code' => [
        'length' => (int) env('REGISTRATION_CODE_LENGTH', 6),
        'expires_minutes' => (int) env('REGISTRATION_CODE_EXPIRES_MINUTES', 15),
        'max_attempts' => (int) env('REGISTRATION_CODE_MAX_ATTEMPTS', 5),
    ],
```

`config/mail.php` (új) teljes tartalma — a Laravel `mailers` kulcsonként merge-el, ezért a teljes `smtp` mailer kell, egyedül a `timeout` tér el a frameworkétől:

```php
<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/mail.php.
 * Mail settings come from config.yml (mail.* -> MAIL_*).
 */
return [

    'mailers' => [

        /*
         * Laravel's smtp mailer with a timeout: without one a hanging SMTP
         * server would hold the registration request open.
         */
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => 10,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

    ],

];
```

`phpunit.xml`: a `<env name="CORS_ALLOWED_ORIGINS" .../>` sor után (így a helyi `config.yml` nem szivárog be a tesztekbe):

```xml
        <env name="REGISTRATION_CODE_LENGTH" value="6"/>
        <env name="REGISTRATION_CODE_EXPIRES_MINUTES" value="15"/>
        <env name="REGISTRATION_CODE_MAX_ATTEMPTS" value="5"/>
```

`config.example.yml`: a `cors:` blokk elé:

```yaml
mail:
  mailer: smtp
  host: smtp-relay.brevo.com
  port: 587
  username: ""          # Brevo SMTP login (Resend: "resend")
  password: ""          # Brevo SMTP key (Resend: API key; host smtp.resend.com)
  from:
    address: no-reply@runeempire.net
    name: RuneEmpire

registration:
  code:
    length: 6           # digits
    expires-minutes: 15
    max-attempts: 5

```

- [ ] **Step 10: Futtasd a teszteket**

Run: `php artisan test --compact tests/Feature/PendingRegistrationsMigrationTest.php tests/Feature/RegistrationCodeTest.php tests/Feature/RegistrationCodeNotificationTest.php`
Expected: PASS.

Run: `php artisan config:show mail.mailers.smtp.timeout`
Expected: `10`.

- [ ] **Step 11: Teljes suite és Pint**

Run: `php artisan test --compact && vendor/bin/pint --dirty --format agent`
Expected: minden teszt PASS, Pint `passed`.

---

### Task 3: A regisztráció függő sort hoz létre és kódot küld

**Files:**
- Create: `app/Actions/StartRegistration.php`
- Create: `app/Http/Resources/PendingRegistrationResource.php`
- Modify: `app/Http/Controllers/Auth/RegisterController.php`
- Modify: `bootstrap/app.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/RegisterTest.php` (teljes csere)

**Interfaces:**
- Consumes: `PendingRegistration`, `PendingRegistrationFactory::expired()`, `RegistrationCode::generate/hash/matches`, `RegistrationCodeNotification` (Task 2); `RegisterRequest` validált `display_name`, `email`, `password` (Task 1); `Account::usernameFor`.
- Produces:
  - `StartRegistration::handle(string $displayName, string $email, string $password): PendingRegistration` — dob: `ThrottleRequestsException` (429, cooldown), `ServiceUnavailableHttpException` (503, levélhiba).
  - Rate limiter név: `register`; cooldown kulcs: `'registration-mail:'.$email`.
  - `POST /api/register` → 202 `{"data": {"email": string, "expires_at": ISO-8601 Zulu}}`.

- [ ] **Step 1: A végleges `RegisterTest`**

`tests/Feature/RegisterTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->createAccountsTable();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function register(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
            ...$overrides,
        ]);
    }

    public function test_registration_is_parked_and_the_code_is_mailed(): void
    {
        $this->freezeSecond();

        $this->register(['email' => ' Patrik@Example.com '])
            ->assertAccepted()
            ->assertExactJson(['data' => [
                'email' => 'patrik@example.com',
                'expires_at' => now()->addMinutes(15)->toIso8601ZuluString(),
            ]]);

        $this->assertSame(0, Account::query()->count(), 'The account is only created when the code is redeemed.');

        $pending = PendingRegistration::query()->sole();
        $this->assertSame('patrikt', $pending->username);
        $this->assertSame('PatrikT', $pending->display_name);
        $this->assertSame('patrik@example.com', $pending->email);
        $this->assertStringStartsWith('$argon2id$v=19$m=1024,t=1,p=1$', $pending->password_hash);
        $this->assertTrue(Hash::check('titkos-jelszo', $pending->password_hash));

        Notification::assertSentOnDemand(
            RegistrationCodeNotification::class,
            fn (RegistrationCodeNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => $notifiable->routes['mail'] === 'patrik@example.com'
                && $notification->expiresInMinutes === 15
                && RegistrationCode::matches($notification->code, $pending->code_hash),
        );
    }

    public function test_code_length_and_expiry_come_from_config(): void
    {
        $this->freezeSecond();
        config([
            'auth.registration_code.length' => 8,
            'auth.registration_code.expires_minutes' => 30,
        ]);

        $this->register()->assertAccepted();

        $this->assertTrue(PendingRegistration::query()->sole()->expires_at->equalTo(now()->addMinutes(30)));
        Notification::assertSentOnDemand(
            RegistrationCodeNotification::class,
            fn (RegistrationCodeNotification $notification): bool => preg_match('/\A\d{8}\z/', $notification->code) === 1
                && $notification->expiresInMinutes === 30,
        );
    }

    public function test_name_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['username' => 'patrikt', 'display_name' => 'PatrikT']);

        $this->register(['display_name' => 'PATRIKT'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('username');

        $this->assertSame(0, PendingRegistration::query()->count());
        Notification::assertNothingSent();
    }

    public function test_email_is_taken_regardless_of_case(): void
    {
        Account::factory()->create(['email' => 'patrik@example.com']);

        $this->register(['email' => 'Patrik@EXAMPLE.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, PendingRegistration::query()->count());
        Notification::assertNothingSent();
    }

    #[DataProvider('invalidEmails')]
    public function test_email_must_be_valid(mixed $email): void
    {
        $this->register(['email' => $email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidEmails(): array
    {
        return [
            'missing' => [null],
            'not an email' => ['nem-email'],
            'too long' => [str_repeat('a', 251).'@x.hu'],
            'array' => [['patrik@example.com']],
        ];
    }

    #[DataProvider('invalidDisplayNames')]
    public function test_display_name_must_follow_minecraft_rules(mixed $displayName): void
    {
        DB::connection('global')->enableQueryLog();

        $this->register(['display_name' => $displayName])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('display_name');

        $this->assertNoQueryMentions('global', 'username', 'Invalid names must not reach the ascii username column.');
        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidDisplayNames(): array
    {
        return [
            'missing' => [null],
            'too short' => ['ab'],
            'too long' => ['abcdefghijklmnopq'],
            'space' => ['Patrik T'],
            'hyphen' => ['Patrik-T'],
            'accented letter' => ['Patrík'],
            'newline' => ["Patrik\nT"],
            'array' => [['PatrikT']],
        ];
    }

    #[DataProvider('invalidPasswords')]
    public function test_password_must_be_valid(string $password, string $confirmation): void
    {
        $this->register(['password' => $password, 'password_confirmation' => $confirmation])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function invalidPasswords(): array
    {
        return [
            'too short' => ['1234567', '1234567'],
            'too long' => [str_repeat('a', 65), str_repeat('a', 65)],
            'confirmation mismatch' => ['titkos-jelszo', 'masik-jelszo'],
        ];
    }

    public function test_re_registering_the_same_name_replaces_the_pending_registration(): void
    {
        $this->register(['email' => 'regi@example.com'])->assertAccepted();
        $this->register(['email' => 'uj@example.com'])->assertAccepted();

        $this->assertSame('uj@example.com', PendingRegistration::query()->sole()->email);
    }

    public function test_re_registering_the_same_email_replaces_the_pending_registration(): void
    {
        $this->register(['display_name' => 'RegiNev'])->assertAccepted();
        $this->travel(61)->seconds();
        $this->register(['display_name' => 'UjNev'])->assertAccepted();

        $this->assertSame('UjNev', PendingRegistration::query()->sole()->display_name);
    }

    public function test_expired_pending_registrations_are_cleaned_up(): void
    {
        PendingRegistration::factory()->expired()->create(['email' => 'patrik@example.com', 'display_name' => 'Masvalaki']);
        $stranger = PendingRegistration::factory()->expired()->create();

        $this->register()->assertAccepted();

        $this->assertSame('PatrikT', PendingRegistration::query()->sole()->display_name);
        $this->assertNull($stranger->fresh());
    }

    public function test_mail_failure_returns_503_and_keeps_nothing(): void
    {
        Exceptions::fake();
        $this->mock(Dispatcher::class, fn (MockInterface $mock) => $mock->shouldReceive('send')->andThrow(new TransportException('SMTP down')));

        $this->register()->assertServiceUnavailable();

        $this->assertSame(0, PendingRegistration::query()->count());
        $this->assertSame(0, RateLimiter::attempts('registration-mail:patrik@example.com'), 'A failed send must not start the cooldown.');
        Exceptions::assertReported(TransportException::class);
    }

    public function test_a_code_is_mailed_at_most_once_a_minute_per_email(): void
    {
        $this->register()->assertAccepted();
        $this->register()->assertTooManyRequests();

        $this->travel(61)->seconds();
        $this->register()->assertAccepted();

        Notification::assertSentOnDemandTimes(RegistrationCodeNotification::class, 2);
    }

    public function test_frontend_origin_passes_cors_preflight(): void
    {
        $this->options('/api/register', [], [
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

        $foreignOrigin = $this->options('/api/register', [], [
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'POST',
        ]);

        $this->assertNotSame('https://evil.example', $foreignOrigin->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_registration_is_rate_limited_per_minute(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }

    public function test_registration_is_rate_limited_per_hour(): void
    {
        foreach (range(1, 20) as $attempt) {
            $this->postJson('/api/register', ['display_name' => 'ab'])->assertUnprocessable();

            if ($attempt % 5 === 0) {
                $this->travel(61)->seconds();
            }
        }

        $this->postJson('/api/register', ['display_name' => 'ab'])->assertTooManyRequests();
    }
}
```

- [ ] **Step 2: Futtasd, hogy elbukjon**

Run: `php artisan test --compact tests/Feature/RegisterTest.php`
Expected: FAIL — pl. `test_registration_is_parked_and_the_code_is_mailed` (201 jön 202 helyett), `test_registration_is_rate_limited_per_hour` (nincs óránkénti limit).

- [ ] **Step 3: Generáld a fájlokat**

Run:

```bash
php artisan make:class Actions/StartRegistration --no-interaction
php artisan make:resource PendingRegistrationResource --no-interaction
```

- [ ] **Step 4: `StartRegistration`**

`app/Actions/StartRegistration.php` teljes tartalma:

```php
<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use App\Support\RegistrationCode;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

class StartRegistration
{
    /**
     * At most one code is mailed to an address within this many seconds.
     */
    private const MAIL_COOLDOWN_SECONDS = 60;

    /**
     * Park validated registration input until its emailed code is redeemed,
     * replacing any pending registration for the same name or email, and mail the code.
     *
     * The mail is sent after the transaction commits, so a slow SMTP server
     * never holds locks in the auth database.
     *
     * @throws ThrottleRequestsException when a code was mailed to this address within the cooldown
     * @throws ServiceUnavailableHttpException when the mail could not be sent
     */
    public function handle(string $displayName, string $email, string $password): PendingRegistration
    {
        $cooldownKey = 'registration-mail:'.$email;

        if (RateLimiter::tooManyAttempts($cooldownKey, 1)) {
            throw new ThrottleRequestsException(
                'Erre az e-mail címre nemrég küldtünk kódot, várj egy percet.',
                headers: ['Retry-After' => RateLimiter::availableIn($cooldownKey)],
            );
        }

        $code = RegistrationCode::generate();
        $username = Account::usernameFor($displayName);
        $passwordHash = Hash::make($password);
        $expiresInMinutes = config('auth.registration_code.expires_minutes');

        $pending = DB::connection('global')->transaction(function () use ($username, $displayName, $email, $passwordHash, $code, $expiresInMinutes): PendingRegistration {
            PendingRegistration::query()->where('expires_at', '<=', now())->delete();
            PendingRegistration::query()->where('username', $username)->orWhere('email', $email)->delete();

            return PendingRegistration::create([
                'username' => $username,
                'display_name' => $displayName,
                'email' => $email,
                'password_hash' => $passwordHash,
                'code_hash' => RegistrationCode::hash($code),
                'expires_at' => now()->addMinutes($expiresInMinutes),
            ]);
        });

        try {
            Notification::route('mail', $email)->notify(new RegistrationCodeNotification($code, $expiresInMinutes));
        } catch (Throwable $exception) {
            $pending->delete();
            report($exception);

            throw new ServiceUnavailableHttpException(message: 'A megerősítő e-mailt most nem sikerült elküldeni, próbáld újra később.');
        }

        RateLimiter::hit($cooldownKey, self::MAIL_COOLDOWN_SECONDS);

        return $pending;
    }
}
```

- [ ] **Step 5: `PendingRegistrationResource`**

`app/Http/Resources/PendingRegistrationResource.php` teljes tartalma:

```php
<?php

namespace App\Http\Resources;

use App\Models\PendingRegistration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PendingRegistration
 */
class PendingRegistrationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'email' => $this->email,
            'expires_at' => $this->expires_at->toIso8601ZuluString(),
        ];
    }
}
```

- [ ] **Step 6: `RegisterController`**

`app/Http/Controllers/Auth/RegisterController.php` teljes tartalma:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Actions\StartRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\PendingRegistrationResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    /**
     * Start a registration: park it and email the code that creates the account.
     */
    public function __invoke(RegisterRequest $request, StartRegistration $startRegistration): JsonResponse
    {
        $pending = $startRegistration->handle(
            $request->validated('display_name'),
            $request->validated('email'),
            $request->validated('password'),
        );

        return (new PendingRegistrationResource($pending))->response()->setStatusCode(202);
    }
}
```

- [ ] **Step 7: Rate limiter és route**

`bootstrap/app.php`: az importok közé:

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
```

és a `->withExceptions(...)` után, a `->create()` elé:

```php
    ->booted(function (): void {
        // Each limit needs its own key, or they would share one counter.
        RateLimiter::for('register', fn (Request $request) => [
            Limit::perMinute(5)->by('minute:'.$request->ip()),
            Limit::perHour(20)->by('hour:'.$request->ip()),
        ]);
    })
```

(Az eredmény: `})->booted(function (): void { ... })->create();`.)

`routes/api.php`: a register route middleware-e:

```php
Route::post('/register', RegisterController::class)
    ->middleware('throttle:register')
    ->name('register');
```

- [ ] **Step 8: Futtasd a teszteket**

Run: `php artisan test --compact tests/Feature/RegisterTest.php`
Expected: PASS.

- [ ] **Step 9: Teljes suite és Pint**

Run: `php artisan test --compact && vendor/bin/pint --dirty --format agent`
Expected: minden teszt PASS, Pint `passed`.

---

### Task 4: Kód beváltása — `POST /api/register/verify`

**Files:**
- Create: `app/Actions/VerifyRegistration.php`
- Create: `app/Http/Requests/VerifyRegistrationRequest.php`
- Create: `app/Http/Controllers/Auth/VerifyRegistrationController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/VerifyRegistrationTest.php`

**Interfaces:**
- Consumes: `PendingRegistration` + factory `withCode()`/`expired()`, `RegistrationCode::matches`, `RegistrationCodeNotification::$code` (Task 2); `RegisterAccount::handle(string $displayName, string $email, string $password): Account` (Task 1); `Account::normalizeEmail` (Task 1); `AccountResource` (meglévő).
- Produces: `VerifyRegistration::handle(string $email, string $code): Account` — dob `ValidationException`-t (`code` vagy `email` mező); `POST /api/register/verify` → 201 `AccountResource`, név: `register.verify`.

- [ ] **Step 1: Generáld a fájlokat**

Run:

```bash
php artisan make:class Actions/VerifyRegistration --no-interaction
php artisan make:request VerifyRegistrationRequest --no-interaction
php artisan make:controller Auth/VerifyRegistrationController --invokable --no-interaction
php artisan make:test VerifyRegistrationTest --phpunit --no-interaction
```

- [ ] **Step 2: Írd meg a tesztet**

`tests/Feature/VerifyRegistrationTest.php` teljes tartalma:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VerifyRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const INVALID_CODE = 'A kód érvénytelen vagy lejárt.';

    protected function setUp(): void
    {
        parent::setUp();

        $this->createAccountsTable();
    }

    private function verify(mixed $code, string $email = 'patrik@example.com'): TestResponse
    {
        return $this->postJson('/api/register/verify', ['email' => $email, 'code' => $code]);
    }

    private function pending(string $code = '123456'): PendingRegistration
    {
        return PendingRegistration::factory()->withCode($code)->create([
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password_hash' => Hash::make('titkos-jelszo'),
        ]);
    }

    public function test_valid_code_creates_the_account(): void
    {
        $pending = $this->pending();

        $this->verify('123456')
            ->assertCreated()
            ->assertExactJson(['data' => [
                'uuid' => '70404374-69da-35c1-82bc-fcf925aa903a',
                'username' => 'patrikt',
                'display_name' => 'PatrikT',
            ]]);

        $account = Account::query()->sole();
        $this->assertSame('patrik@example.com', $account->email);
        $this->assertSame('0.0.0.0', $account->registered_ip);
        $this->assertSame($pending->password_hash, $account->password_hash, 'The pending argon2id hash moves over unchanged.');
        $this->assertTrue(Hash::check('titkos-jelszo', $account->password_hash));
        $this->assertSame(0, PendingRegistration::query()->count());
    }

    public function test_code_with_leading_zero_is_accepted(): void
    {
        $this->pending('012345');

        $this->verify('012345')->assertCreated();
    }

    public function test_email_is_matched_after_normalization(): void
    {
        $this->pending();

        $this->verify('123456', ' Patrik@Example.COM ')->assertCreated();
    }

    #[DataProvider('invalidCodes')]
    public function test_code_must_be_a_string_of_the_configured_digits(mixed $code): void
    {
        $pending = $this->pending('012345');

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->assertSame(0, $pending->fresh()->attempts, 'Malformed input is not an attempt.');
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidCodes(): array
    {
        return [
            'json number' => [12345],
            'too short' => ['12345'],
            'too long' => ['1234567'],
            'letter' => ['12a456'],
            'missing' => [null],
        ];
    }

    public function test_wrong_code_counts_an_attempt(): void
    {
        $pending = $this->pending();

        $this->verify('654321')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(1, $pending->fresh()->attempts);
        $this->assertSame(0, Account::query()->count());
    }

    public function test_pending_registration_is_dropped_after_max_attempts(): void
    {
        config(['auth.registration_code.max_attempts' => 3]);
        $this->pending();

        foreach (range(1, 3) as $attempt) {
            $this->verify('654321')->assertUnprocessable();
        }

        $this->assertSame(0, PendingRegistration::query()->count());
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
        $this->assertSame(0, Account::query()->count());
    }

    public function test_expired_code_is_rejected(): void
    {
        PendingRegistration::factory()->expired()->withCode('123456')->create(['email' => 'patrik@example.com']);

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(0, Account::query()->count());
    }

    public function test_unknown_email_gets_the_same_error(): void
    {
        $this->verify('123456', 'senki@example.com')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    /**
     * @param  array<string, string>  $existingAccount
     */
    #[DataProvider('takenMeanwhile')]
    public function test_name_or_email_taken_meanwhile_cancels_the_registration(array $existingAccount): void
    {
        Account::factory()->create($existingAccount);
        $this->pending();

        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(1, Account::query()->count());
        $this->assertSame(0, PendingRegistration::query()->count());
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function takenMeanwhile(): array
    {
        return [
            'name' => [['username' => 'patrikt', 'display_name' => 'PatrikT']],
            'email' => [['email' => 'patrik@example.com']],
        ];
    }

    public function test_a_redeemed_code_cannot_be_used_twice(): void
    {
        $this->pending();

        $this->verify('123456')->assertCreated();
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(1, Account::query()->count());
    }

    public function test_only_the_latest_code_works_after_re_registering(): void
    {
        Notification::fake();
        $payload = [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'titkos-jelszo',
            'password_confirmation' => 'titkos-jelszo',
        ];

        $this->postJson('/api/register', $payload)->assertAccepted();
        $this->travel(61)->seconds();
        $this->postJson('/api/register', $payload)->assertAccepted();

        $codes = [];
        Notification::assertSentOnDemand(RegistrationCodeNotification::class, function (RegistrationCodeNotification $notification) use (&$codes): bool {
            $codes[] = $notification->code;

            return true;
        });
        [$oldCode, $newCode] = $codes;

        if ($oldCode !== $newCode) {
            $this->verify($oldCode)->assertUnprocessable();
        }
        $this->verify($newCode)->assertCreated();
    }

    public function test_verification_is_rate_limited(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this->verify('123456', 'senki@example.com')->assertUnprocessable();
        }

        $this->verify('123456', 'senki@example.com')->assertTooManyRequests();
    }
}
```

- [ ] **Step 3: Futtasd, hogy elbukjon**

Run: `php artisan test --compact tests/Feature/VerifyRegistrationTest.php`
Expected: FAIL — `404` a `/api/register/verify`-re.

- [ ] **Step 4: `VerifyRegistrationRequest`**

`app/Http/Requests/VerifyRegistrationRequest.php` teljes tartalma:

```php
<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class VerifyRegistrationRequest extends FormRequest
{
    /**
     * The email is looked up the way registration stored it.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Account::normalizeEmail($this->input('email'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The code must be a string: a JSON number would lose leading zeros.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $length = config('auth.registration_code.length');

        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'regex:/\A\d{'.$length.'}\z/'],
        ];
    }
}
```

- [ ] **Step 5: `VerifyRegistration`**

`app/Actions/VerifyRegistration.php` teljes tartalma:

```php
<?php

namespace App\Actions;

use App\Models\Account;
use App\Models\PendingRegistration;
use App\Support\RegistrationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyRegistration
{
    public function __construct(private RegisterAccount $registerAccount) {}

    /**
     * Redeem an emailed code: turn the pending registration into a PAxAuth account.
     *
     * A missing, expired or wrong code gets one shared message, so the endpoint
     * does not reveal whether an address has a pending registration.
     *
     * @throws ValidationException
     */
    public function handle(string $email, string $code): Account
    {
        $pending = PendingRegistration::query()->where('email', $email)->first();

        if ($pending === null || $pending->expires_at->isPast()) {
            throw self::invalidCode();
        }

        if (! RegistrationCode::matches($code, $pending->code_hash)) {
            $pending->increment('attempts');

            if ($pending->attempts >= config('auth.registration_code.max_attempts')) {
                $pending->delete();
            }

            throw self::invalidCode();
        }

        // Errors are returned, not thrown, inside the transaction: throwing would
        // roll back the deletion of the pending row.
        $result = DB::connection('global')->transaction(function () use ($pending): Account|ValidationException {
            $pending = PendingRegistration::query()->lockForUpdate()->find($pending->getKey());

            if ($pending === null) {
                return self::invalidCode();
            }

            $pending->delete();

            $taken = Account::query()
                ->where('username', $pending->username)
                ->orWhere('email', $pending->email)
                ->exists();

            if ($taken) {
                return ValidationException::withMessages([
                    'email' => 'Ez a név vagy e-mail cím időközben foglalt lett, regisztrálj újra.',
                ]);
            }

            return $this->registerAccount->handle($pending->display_name, $pending->email, $pending->password_hash);
        });

        if ($result instanceof ValidationException) {
            throw $result;
        }

        return $result;
    }

    private static function invalidCode(): ValidationException
    {
        return ValidationException::withMessages(['code' => 'A kód érvénytelen vagy lejárt.']);
    }
}
```

- [ ] **Step 6: Controller és route**

`app/Http/Controllers/Auth/VerifyRegistrationController.php` teljes tartalma:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Actions\VerifyRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyRegistrationRequest;
use App\Http\Resources\AccountResource;
use Illuminate\Http\JsonResponse;

class VerifyRegistrationController extends Controller
{
    /**
     * Redeem the emailed code and create the PAxAuth account.
     */
    public function __invoke(VerifyRegistrationRequest $request, VerifyRegistration $verifyRegistration): JsonResponse
    {
        $account = $verifyRegistration->handle(
            $request->validated('email'),
            $request->validated('code'),
        );

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
```

`routes/api.php` teljes tartalma:

```php
<?php

use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\VerifyRegistrationController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => ['status' => 'ok']);

Route::post('/register', RegisterController::class)
    ->middleware('throttle:register')
    ->name('register');

Route::post('/register/verify', VerifyRegistrationController::class)
    ->middleware('throttle:10,1')
    ->name('register.verify');
```

- [ ] **Step 7: Futtasd a teszteket**

Run: `php artisan test --compact tests/Feature/VerifyRegistrationTest.php`
Expected: PASS.

- [ ] **Step 8: Teljes ellenőrzés**

Run:

```bash
php artisan test --compact
vendor/bin/pint --dirty --format agent
php artisan route:list --except-vendor
```

Expected: minden teszt PASS; Pint `passed`; a route-lista: `GET api/ping`, `POST api/register`, `POST api/register/verify`.

- [ ] **Step 9: Élő ellenőrzés a felhasználóval (kód nélkül, kézi lépés)**

A felhasználó helyi `config.yml`-je még nem tartalmazza az új részeket. Kérd meg, hogy:

1. másolja át a `config.example.yml` `mail:` és `registration:` blokkját a saját `config.yml`-jébe, és töltse ki a Brevo SMTP login/key értékeit;
2. futtassa: `php artisan migrate` (a `pending_registrations` a Dockeres auth DB-ben jön létre — a `global` felhasználónak kell `CREATE` jog);
3. küldjön egy regisztrációt (pl. `curl -X POST http://localhost:8000/api/register -H "Accept: application/json" -H "Content-Type: application/json" -d "{\"display_name\":\"TesztNev\",\"email\":\"<sajat-cim>\",\"password\":\"titkos-jelszo\",\"password_confirmation\":\"titkos-jelszo\"}"` futó `php artisan serve` mellett), és a levélben kapott kódot váltsa be a `/api/register/verify`-n.

Ellenőrzés után olvasható lekérdezéssel nézd meg, hogy a fiók bekerült-e az `accounts`-ba e-maillel, és a `pending_registrations` üres-e.
