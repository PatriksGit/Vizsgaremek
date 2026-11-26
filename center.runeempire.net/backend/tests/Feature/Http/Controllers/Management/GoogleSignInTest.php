<?php

namespace Tests\Feature\Http\Controllers\Management;

use App\Actions\FindManagementPermission;
use App\Http\Middleware\ManagementPageErrors;
use App\Models\Account;
use App\Models\Manager;
use App\Support\ManagementSession;
use App\Support\PluginDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * The management area's Google sign-in (2026-11-23): a logged-in player who
 * holds runecenter.management goes to Google, and comes back with an address
 * Google vouches for. Both pages are opened as full pages, so every answer is
 * a redirect to the frontend, never a JSON body. Google itself is faked.
 */
class GoogleSignInTest extends TestCase
{
    use LazilyRefreshDatabase;

    /** FRONTEND_URL in phpunit.xml. */
    private const FRONTEND = 'http://localhost:5173';

    /** A full-page navigation from the website's management page. */
    private const FROM_MANAGEMENT_PAGE = ['Referer' => 'http://localhost:5173/management'];

    /** Google sends the browser back with its own Referer. */
    private const FROM_GOOGLE = ['Referer' => 'https://accounts.google.com/'];

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->account = Account::factory()->withPassword('titkos-jelszo')->create(['display_name' => 'PatrikT']);
    }

    private function grantPermission(): void
    {
        PluginDatabase::table('luckperms', 'luckperms_user_permissions')->insert([
            'uuid' => $this->account->uuid, 'permission' => FindManagementPermission::NODE, 'value' => 1, 'server' => 'global', 'world' => 'global', 'expiry' => 0, 'contexts' => '{}',
        ]);
    }

    /**
     * Logs in on the website, then goes on like a browser with that session cookie.
     */
    private function logIn(string $password = 'titkos-jelszo'): string
    {
        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => $password], self::FROM_WEBSITE)->assertOk();
        $sessionId = $this->lastSessionId();
        $this->asBrowserWithSession($sessionId);

        return $sessionId;
    }

    /**
     * The Google provider Socialite would hand out, faked.
     */
    private function fakeGoogle(): MockInterface
    {
        $provider = Mockery::mock(GoogleProvider::class);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        return $provider;
    }

    /**
     * The user Socialite reads from Google; null leaves email_verified out of Google's answer.
     */
    private function googleUser(string $email, ?bool $verified = true): GoogleUser
    {
        $raw = ['sub' => '1234567890', 'email' => $email];
        if ($verified !== null) {
            $raw['email_verified'] = $verified;
        }

        return (new GoogleUser)->setRaw($raw)->map(['id' => '1234567890', 'email' => $email]);
    }

    private function googleAnswers(GoogleUser $user): void
    {
        $this->fakeGoogle()->shouldReceive('user')->once()->andReturn($user);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function toGoogle(array $headers = self::FROM_MANAGEMENT_PAGE): TestResponse
    {
        return $this->get('/api/management/google/redirect', $headers);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function backFromGoogle(array $headers = self::FROM_GOOGLE): TestResponse
    {
        return $this->get('/api/management/google/callback?state=abc&code=xyz', $headers);
    }

    private function grant(): mixed
    {
        return $this->app['session']->driver()->get('management');
    }

    /**
     * Puts a Google grant into the logged-in browser's session, as an earlier callback would.
     */
    private function giveGrant(string $email = 'boss@example.com'): void
    {
        $session = $this->app['session']->driver();
        $session->setId($this->lastSessionId());
        $session->start();
        ManagementSession::grant($session, $this->account, $email);
        $session->save();
    }

    public function test_redirect_with_a_live_listed_grant_goes_straight_home(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->giveGrant();
        Socialite::shouldReceive('driver')->never();

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/');

        $this->assertSame('boss@example.com', $this->grant()['email']);
    }

    public function test_redirect_with_a_grant_whose_address_was_removed_goes_to_google_and_drops_it(): void
    {
        $this->grantPermission();
        $this->logIn();
        $this->giveGrant('removed@example.com');
        $this->fakeGoogle()->shouldReceive('setScopes->with->redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth?state=abc'));

        $this->toGoogle()->assertRedirect('https://accounts.google.com/o/oauth2/auth?state=abc');

        $this->assertNull($this->grant());
    }

    public function test_redirect_with_a_live_grant_but_no_permission_is_forbidden(): void
    {
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->giveGrant();
        Socialite::shouldReceive('driver')->never();

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');
    }

    public function test_a_refused_callback_drops_an_earlier_grant(): void
    {
        // A grant from an earlier sign-in must not outlive a failed new one, or the
        // page would open the dashboard instead of showing the error.
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->giveGrant();
        $this->googleAnswers($this->googleUser('stranger@example.com'));

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.not_allowed&email='.urlencode('stranger@example.com'));

        $this->assertNull($this->grant());
    }

    public function test_redirect_sends_a_permitted_player_to_google_with_openid_email_scopes(): void
    {
        $this->grantPermission();
        $this->logIn();
        $provider = $this->fakeGoogle();
        $provider->shouldReceive('setScopes')->once()->with(['openid', 'email'])->andReturnSelf();
        $provider->shouldReceive('with')->once()->with(['prompt' => 'select_account'])->andReturnSelf();
        $provider->shouldReceive('redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth?state=abc'));

        $this->toGoogle()->assertRedirect('https://accounts.google.com/o/oauth2/auth?state=abc');
    }

    public function test_the_real_provider_builds_googles_url_and_keeps_the_state_in_the_session(): void
    {
        // Socialite itself, not faked: redirect() only builds the URL, nothing is sent to Google.
        $this->grantPermission();
        $this->logIn();

        $location = (string) $this->toGoogle()->assertRedirect()->headers->get('Location');

        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/auth?', $location);
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
        $this->assertSame('openid email', $query['scope']);
        $this->assertSame('select_account', $query['prompt']);
        $this->assertSame('code', $query['response_type']);
        $this->assertSame(config('services.google.client_id'), $query['client_id']);
        $this->assertSame(config('services.google.redirect'), $query['redirect_uri']);
        $this->assertNotEmpty($query['state']);
        $this->assertSame($query['state'], $this->app['session']->driver()->get('state'));
    }

    public function test_the_real_provider_refuses_a_callback_without_its_state(): void
    {
        // No redirect started in this session: Socialite's state check fails before any code exchange.
        Exceptions::fake();
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.google_failed');

        Exceptions::assertReported(InvalidStateException::class);
        $this->assertNull($this->grant());
    }

    public function test_a_refusal_keeps_the_session_cookie(): void
    {
        $sessionId = $this->logIn();

        $response = $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');

        $this->assertSame($sessionId, $response->getCookie(config('session.cookie'))?->getValue());
    }

    public function test_a_session_whose_account_was_locked_goes_to_login(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->blockAccount($this->account, ['locked' => true]);
        $this->fakeGoogle()->shouldNotReceive('user');

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/login');

        $this->assertNull($this->grant());
    }

    public function test_a_session_ended_by_a_password_change_elsewhere_goes_to_login(): void
    {
        // Sanctum keeps the password hash in the session at login; a change from
        // another session (or a reset) makes it stale, and that ends this session.
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->account->update(['password_hash' => Hash::make('uj-jelszo-123')]);
        $this->fakeGoogle()->shouldNotReceive('redirect');

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/login');

        $this->logIn('uj-jelszo-123');
        $this->account->update(['password_hash' => Hash::make('harmadik-jelszo')]);
        $this->fakeGoogle()->shouldNotReceive('user');

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/login');

        $this->assertNull($this->grant());
    }

    public function test_the_session_password_check_runs_after_the_session_starts_and_before_auth(): void
    {
        foreach (['management.google.redirect', 'management.google.callback'] as $name) {
            $middleware = app('router')->gatherRouteMiddleware(app('router')->getRoutes()->getByName($name));
            $at = fn (string $entry): int|false => array_search($entry, $middleware, true);

            $this->assertSame(0, $at(ManagementPageErrors::class), $name);
            $this->assertLessThan($at(AuthenticateSession::class), $at(StartSession::class), $name);
            $this->assertLessThan($at('Illuminate\Auth\Middleware\Authenticate:sanctum'), $at(AuthenticateSession::class), $name);
            $this->assertLessThan($at('Illuminate\Routing\Middleware\ThrottleRequests:management'), $at('Illuminate\Auth\Middleware\Authenticate:sanctum'), $name);
            $this->assertNotContains(EnsureFrontendRequestsAreStateful::class, $middleware, $name);
        }
    }

    public function test_redirect_from_the_website_keeps_the_same_session(): void
    {
        // The website's Referer makes Sanctum start the session too: it must
        // still be the login's session, sent back unchanged in the cookie
        // (Socialite keeps its state there for the callback).
        $this->grantPermission();
        $sessionId = $this->logIn();
        $provider = $this->fakeGoogle();
        $provider->shouldReceive('setScopes->with->redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth?state=abc'));

        $response = $this->toGoogle();

        $this->assertSame($sessionId, $this->lastSessionId());
        $cookie = $response->getCookie(config('session.cookie'));
        $this->assertSame($sessionId, $cookie?->getValue());
        // What Sanctum's stateful middleware would set, here from config/session.php alone.
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
    }

    public function test_redirect_without_the_permission_goes_to_management_with_forbidden(): void
    {
        $this->logIn();
        $this->fakeGoogle()->shouldNotReceive('redirect');

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');
    }

    public function test_redirect_when_luckperms_cannot_be_read_is_forbidden(): void
    {
        Exceptions::fake();
        $this->grantPermission();
        $this->logIn();
        config(['database.plugins.luckperms' => 'center_missing_test']);
        $this->fakeGoogle()->shouldNotReceive('redirect');

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');

        Exceptions::assertReported(QueryException::class);
    }

    public function test_redirect_for_a_guest_goes_to_login(): void
    {
        $this->toGoogle()->assertRedirect(self::FRONTEND.'/login');
    }

    public function test_redirect_without_a_client_id_is_google_unavailable(): void
    {
        config(['services.google.client_id' => null]);
        $this->grantPermission();
        $this->logIn();
        $this->fakeGoogle()->shouldNotReceive('redirect');

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.google_unavailable');
    }

    public function test_callback_with_a_listed_verified_address_grants_and_goes_home(): void
    {
        $this->freezeSecond();
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $sessionId = $this->logIn();
        $this->googleAnswers($this->googleUser('boss@example.com'));

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/');

        $this->assertSame(['account_id' => $this->account->id, 'email' => 'boss@example.com', 'expires_at' => now()->addMinutes(30)->getTimestamp()], $this->grant());
        $newSessionId = $this->lastSessionId();
        $this->assertNotSame($sessionId, $newSessionId, 'the session id is regenerated');

        // The website login lives on in the new session.
        $this->asBrowserWithSession($newSessionId)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertJsonPath('data.username', 'patrikt');

        // The old id is destroyed: a copy of the old cookie is a guest now (/me answers guests with data null).
        $this->asBrowserWithSession($sessionId)->getJson('/api/auth/me', self::FROM_WEBSITE)->assertOk()->assertExactJson(['data' => null]);
    }

    public function test_callback_matches_the_address_case_insensitively(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->googleAnswers($this->googleUser('Boss@Example.com'));

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/');

        $this->assertSame('boss@example.com', $this->grant()['email']);
    }

    public function test_callback_with_an_unlisted_address_is_not_allowed_and_shows_the_address(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->googleAnswers($this->googleUser('Someone+else@gmail.com'));

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.not_allowed&email='.urlencode('Someone+else@gmail.com'));

        $this->assertNull($this->grant());
    }

    /**
     * @return array<string, array{bool|null}>
     */
    public static function unverifiedFlags(): array
    {
        return ['false' => [false], 'missing' => [null]];
    }

    #[DataProvider('unverifiedFlags')]
    public function test_callback_with_an_unverified_or_missing_email_verified_is_refused(?bool $verified): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->googleAnswers($this->googleUser('boss@example.com', $verified));

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.email_unverified');

        $this->assertNull($this->grant());
    }

    public function test_a_verified_flag_that_is_not_a_real_boolean_is_refused(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $user = $this->googleUser('boss@example.com');
        $user->setRaw(['email' => 'boss@example.com', 'email_verified' => 'false']);
        $this->googleAnswers($user);

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.email_unverified');
    }

    public function test_callback_when_google_throws_is_google_failed(): void
    {
        Exceptions::fake();
        $this->grantPermission();
        $this->logIn();
        $this->fakeGoogle()->shouldReceive('user')->once()->andThrow(new InvalidStateException('Google secret text'));

        $response = $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.google_failed');

        $this->assertStringNotContainsString('secret', (string) $response->headers->get('Location'));
        Exceptions::assertReported(fn (InvalidStateException $exception): bool => $exception->getMessage() === 'Google secret text');
        $this->assertNull($this->grant());
    }

    public function test_callback_without_the_permission_is_forbidden(): void
    {
        // The node was taken away between the redirect and Google's answer.
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->fakeGoogle()->shouldNotReceive('user');

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');

        $this->assertNull($this->grant());
    }

    public function test_callback_for_a_guest_goes_to_login(): void
    {
        $this->fakeGoogle()->shouldNotReceive('user');

        $this->backFromGoogle()->assertRedirect(self::FRONTEND.'/login');
    }

    public function test_callback_reads_the_session_without_a_website_referer(): void
    {
        $this->grantPermission();
        Manager::create(['email' => 'boss@example.com']);
        $this->logIn();
        $this->googleAnswers($this->googleUser('boss@example.com'));

        $this->backFromGoogle([])->assertRedirect(self::FRONTEND.'/');

        $this->assertSame('boss@example.com', $this->grant()['email']);
    }

    public function test_the_throttle_answers_with_a_redirect_not_json(): void
    {
        $this->logIn();
        $this->fakeGoogle()->shouldNotReceive('redirect');

        for ($i = 0; $i < 10; $i++) {
            $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=management.forbidden');
        }

        $this->toGoogle()->assertRedirect(self::FRONTEND.'/management?error=too_many_requests');
    }
}
