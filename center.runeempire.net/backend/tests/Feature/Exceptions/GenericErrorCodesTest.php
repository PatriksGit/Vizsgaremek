<?php

namespace Tests\Feature\Exceptions;

use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * Errors that are not our own exceptions still get a code, and a Hungarian
 * message where the framework's own text is English.
 */
class GenericErrorCodesTest extends TestCase
{
    public function test_a_name_outside_the_skin_route_pattern_is_not_found(): void
    {
        $this->getJson('/api/players/a/skin')
            ->assertNotFound()
            ->assertJsonPath('message', 'A keresett oldal vagy adat nem található.')
            ->assertJsonPath('code', 'not_found');
    }

    public function test_an_unknown_api_path_is_not_found(): void
    {
        $this->getJson('/api/nincs-ilyen')
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }

    public function test_a_wrong_method_is_not_allowed(): void
    {
        $this->getJson('/api/auth/login')
            ->assertMethodNotAllowed()
            ->assertJsonPath('message', 'Ez a kérés itt nem engedélyezett.')
            ->assertJsonPath('code', 'method_not_allowed');
    }

    public function test_a_guest_gets_unauthenticated_with_the_hungarian_message(): void
    {
        $this->getJson('/api/me/stats')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Ehhez be kell jelentkezned.', 'code' => 'unauthenticated']);
    }

    public function test_several_field_errors_are_one_validation_failed(): void
    {
        $this->postJson('/api/auth/register', ['display_name' => 'a b', 'email' => 'nem-email'], self::FROM_WEBSITE)
            ->assertUnprocessable()
            ->assertJsonPath('code', 'validation_failed')
            ->assertJsonValidationErrors(['display_name', 'email']);
    }

    public function test_an_unexpected_exception_is_a_server_error_in_hungarian(): void
    {
        Exceptions::fake();
        config(['app.debug' => false]);
        Route::middleware('api')->get('/api/test-crash', fn () => throw new RuntimeException('SQLSTATE[HY000] belső részlet'));

        $this->getJson('/api/test-crash')
            ->assertInternalServerError()
            ->assertExactJson(['message' => 'Váratlan hiba történt.', 'code' => 'server_error']);
    }

    /**
     * A plain throttle:x,y route (no named limiter with its own answer) must
     * not show the framework's English "Too Many Attempts." to a player.
     */
    public function test_a_bare_throttle_answers_in_hungarian(): void
    {
        Route::middleware(['api', 'throttle:1,1'])->get('/api/test-throttle', fn () => 'ok');

        $this->getJson('/api/test-throttle')->assertOk();
        $this->getJson('/api/test-throttle')
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'too_many_requests')
            ->assertJsonPath('message', 'Túl sok próbálkozás, próbáld újra később.')
            ->assertHeader('Retry-After');
    }

    /**
     * Only Laravel's validation messages are kept as they are: any other
     * exception's text on these statuses is not written for players.
     */
    public function test_a_foreign_exception_on_a_kept_status_gets_the_hungarian_default(): void
    {
        config(['app.debug' => false]);
        Route::middleware('api')->get('/api/test-401', fn () => throw new HttpException(401, 'Raw 401 text'));
        Route::middleware('api')->get('/api/test-422', fn () => throw new HttpException(422, 'Raw 422 text'));

        $this->getJson('/api/test-401')->assertExactJson(['message' => 'Ehhez be kell jelentkezned.', 'code' => 'unauthenticated']);
        $this->getJson('/api/test-422')->assertExactJson(['message' => 'Az elküldött adatok hibásak.', 'code' => 'validation_failed']);
    }

    public function test_debug_mode_keeps_the_debug_body_but_adds_the_code(): void
    {
        Exceptions::fake();
        config(['app.debug' => true]);
        Route::middleware('api')->get('/api/test-crash', fn () => throw new RuntimeException('belső részlet'));

        $this->getJson('/api/test-crash')
            ->assertInternalServerError()
            ->assertJsonPath('code', 'server_error')
            ->assertJsonPath('message', 'belső részlet')
            ->assertJsonStructure(['exception', 'trace']);
    }
}
