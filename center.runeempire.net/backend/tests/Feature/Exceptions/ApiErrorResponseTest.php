<?php

namespace Tests\Feature\Exceptions;

use App\Exceptions\ApiErrorResponse;
use App\Exceptions\Auth\CodeRecentlySent;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ApiErrorResponseTest extends TestCase
{
    public function test_builds_the_contract_body(): void
    {
        $response = TestResponse::fromBaseResponse(
            ApiErrorResponse::make('auth.x', 'Üzenet', 429, ['Retry-After' => 5], ['email' => ['m']], ['resend_at' => 'T']),
        );

        $response->assertStatus(429)
            ->assertHeader('Retry-After', '5')
            ->assertExactJson(['message' => 'Üzenet', 'code' => 'auth.x', 'errors' => ['email' => ['m']], 'details' => ['resend_at' => 'T']]);
    }

    public function test_omits_empty_errors_and_details(): void
    {
        TestResponse::fromBaseResponse(ApiErrorResponse::make('not_found', 'x', 404))
            ->assertExactJson(['message' => 'x', 'code' => 'not_found']);
    }

    /**
     * The deadline is fixed when the cooldown is found, however late the
     * answer is rendered.
     */
    public function test_resend_at_is_fixed_when_the_exception_is_made(): void
    {
        $this->freezeTime();
        $made = now();
        $exception = new CodeRecentlySent(30);

        $this->travel(10)->seconds();

        $this->assertSame($made->copy()->addSeconds(30)->toIso8601ZuluString(), $exception->details()['resend_at']);
    }

    public function test_generic_code_for_status(): void
    {
        $this->assertSame('not_found', ApiErrorResponse::genericCodeFor(404));
        $this->assertSame('bad_request', ApiErrorResponse::genericCodeFor(418));
        $this->assertSame('server_error', ApiErrorResponse::genericCodeFor(502));
        $this->assertSame('validation_failed', ApiErrorResponse::genericCodeFor(422));
        $this->assertSame('service_unavailable', ApiErrorResponse::genericCodeFor(503));
    }
}
