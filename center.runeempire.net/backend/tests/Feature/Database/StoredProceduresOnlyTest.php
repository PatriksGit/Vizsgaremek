<?php

namespace Tests\Feature\Database;

use App\Notifications\RegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * The exam requirement: the application's own data is only reached through
 * stored procedures. Every statement the auth database receives during the
 * whole account lifecycle must be a CALL, and the lifecycle uses all of them.
 */
class StoredProceduresOnlyTest extends TestCase
{
    use RefreshDatabase;

    private const PROCEDURES = [
        'FindAccountById',
        'FindAccountByUsername',
        'AccountUsernameExists',
        'AccountEmailExists',
        'AccountUsernameOrEmailExists',
        'CreateAccount',
        'UpdateAccountPassword',
        'DeleteExpiredPendingRegistrations',
        'FindPendingRegistrationsByUsernameOrEmail',
        'CreatePendingRegistration',
        'FindPendingRegistrationByEmailForUpdate',
        'UpdatePendingRegistrationAttempts',
        'DeletePendingRegistration',
    ];

    public function test_the_account_lifecycle_reaches_the_auth_database_only_through_stored_procedures(): void
    {
        Notification::fake();
        DB::connection('global')->enableQueryLog();

        // Register on the website, guess wrong once, then redeem the mailed code.
        $this->postJson('/api/auth/register', [
            'display_name' => 'PatrikT',
            'email' => 'patrik@example.com',
            'password' => 'regi-jelszo',
            'password_confirmation' => 'regi-jelszo',
            'terms' => true,
            'age_confirmed' => true,
        ], self::FROM_WEBSITE)->assertAccepted();
        $session = $this->lastSessionId();

        $code = Notification::sent(Notification::route('mail', 'patrik@example.com'), RegistrationCodeNotification::class)->sole()->code;
        $wrongCode = $code === '000000' ? '111111' : '000000';

        $this->asBrowserWithSession($session)
            ->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => $wrongCode], self::FROM_WEBSITE)
            ->assertUnprocessable();
        $this->asBrowserWithSession($session)
            ->postJson('/api/auth/register/verify', ['email' => 'patrik@example.com', 'code' => $code], self::FROM_WEBSITE)
            ->assertCreated();
        $session = $this->lastSessionId();

        // Logged in: read the account, change the password, log out, log in again.
        $this->asBrowserWithSession($session)->getJson('/api/auth/me', self::FROM_WEBSITE)
            ->assertJsonPath('data.display_name', 'PatrikT');
        $this->asBrowserWithSession($session)->putJson('/api/auth/password', [
            'current_password' => 'regi-jelszo',
            'password' => 'uj-titkos-jelszo',
            'password_confirmation' => 'uj-titkos-jelszo',
        ], self::FROM_WEBSITE)->assertNoContent();
        $session = $this->lastSessionId();

        $this->asBrowserWithSession($session)->postJson('/api/auth/logout', [], self::FROM_WEBSITE)->assertNoContent();
        $this->asBrowserWithSession($this->lastSessionId())
            ->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'uj-titkos-jelszo'], self::FROM_WEBSITE)
            ->assertOk();

        // The admin command creates an account the same way.
        $this->artisan('user:register', ['username' => 'Masvalaki', 'email' => 'masik@example.com', '--password' => 'titkos-jelszo'])
            ->assertSuccessful();

        $statements = array_column(DB::connection('global')->getQueryLog(), 'query');

        foreach ($statements as $statement) {
            $this->assertMatchesRegularExpression('/\ACALL \w+\(/', $statement, 'The auth database got SQL that is not a stored procedure call.');
        }

        $called = array_unique(array_map(fn (string $statement): string => (string) preg_replace('/\ACALL (\w+)\(.*\z/s', '$1', $statement), $statements));
        $this->assertEqualsCanonicalizing(self::PROCEDURES, array_values($called), 'Every stored procedure should be in use, and no other.');
    }
}
