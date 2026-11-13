<?php

namespace Tests\Feature\Http\Controllers\Auth;

use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Support\PasswordResetGuesses;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VerifyPasswordResetCodeControllerTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const INVALID_CODE = 'A kód érvénytelen vagy lejárt.';

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->account = Account::factory()->create(['display_name' => 'PatrikT', 'email' => 'patrik@example.com']);
    }

    private function resetCode(string $code = '123456'): PasswordResetCode
    {
        return PasswordResetCode::factory()->forAccount($this->account)->withCode($code)->create();
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function verify(mixed $code, string $email = 'patrik@example.com', array $headers = self::FROM_WEBSITE): TestResponse
    {
        return $this->postJson('/api/auth/password/forgot/verify', ['email' => $email, 'code' => $code], $headers);
    }

    private function guesses(): int
    {
        return RateLimiter::attempts('password-reset-guess:'.$this->account->id);
    }

    public function test_right_code_returns_204_deletes_the_code_and_grants_the_session(): void
    {
        $resetCode = $this->resetCode();

        $this->verify('123456')->assertNoContent();

        $this->assertModelMissing($resetCode);
        $this->assertSame($this->account->id, session('password_reset.account_id'));
    }

    public function test_finds_the_account_with_capitals_and_spaces_in_the_address(): void
    {
        $this->resetCode();

        $this->verify('123456', ' Patrik@Example.com ')->assertNoContent();
    }

    public function test_wrong_code_returns_422_counts_an_attempt_and_spends_the_budget(): void
    {
        $resetCode = $this->resetCode();

        $this->verify('654321')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertDatabaseHas('password_reset_codes', ['id' => $resetCode->id, 'attempts' => 1]);
        $this->assertSame(1, $this->guesses());
        $this->assertNull(session('password_reset'));
    }

    public function test_fifth_wrong_code_deletes_the_code(): void
    {
        $resetCode = $this->resetCode();

        for ($guess = 0; $guess < 5; $guess++) {
            $this->verify('654321')->assertUnprocessable();
        }

        $this->assertModelMissing($resetCode);
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    public function test_expired_or_missing_code_is_refused_without_spending_the_budget(): void
    {
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        PasswordResetCode::factory()->forAccount($this->account)->expired()->create();
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertSame(0, $this->guesses());
    }

    public function test_the_right_code_works_only_once(): void
    {
        $this->resetCode();

        $this->verify('123456')->assertNoContent();
        $this->verify('123456')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    public function test_a_right_code_clears_the_guess_budget(): void
    {
        $this->resetCode();
        $this->verify('654321')->assertUnprocessable();
        $this->verify('111111')->assertUnprocessable();

        $this->verify('123456')->assertNoContent();

        $this->assertSame(0, $this->guesses());
    }

    public function test_spent_budget_returns_429_even_for_the_right_code(): void
    {
        $resetCode = $this->resetCode();

        for ($guess = 0; $guess < 10; $guess++) {
            PasswordResetGuesses::count($this->account->id);
        }

        $this->verify('123456')
            ->assertTooManyRequests()
            ->assertJson(['message' => 'Túl sok hibás kódpróbálkozás volt ezzel a címmel. Próbáld újra holnap, vagy írj nekünk Discordon.'])
            ->assertHeader('Retry-After');

        $this->assertDatabaseHas('password_reset_codes', ['id' => $resetCode->id, 'attempts' => 0]);
        $this->assertNull(session('password_reset'));
    }

    /**
     * The budget belongs to the account, not to a code: asking for a new code
     * after five wrong guesses gives five more, then nothing, not even for
     * the right code.
     */
    public function test_a_new_code_does_not_give_new_guesses_beyond_the_daily_budget(): void
    {
        $this->resetCode('111111');

        for ($guess = 0; $guess < 5; $guess++) {
            $this->verify('654321')->assertUnprocessable();
        }

        $this->resetCode('222222');

        for ($guess = 0; $guess < 5; $guess++) {
            $this->verify('654321')->assertUnprocessable();
        }

        $this->verify('222222')->assertTooManyRequests();
        $this->assertNull(session('password_reset'));
    }

    public function test_verify_is_rate_limited_per_ip(): void
    {
        for ($request = 1; $request <= 10; $request++) {
            $this->verify('123456', "senki{$request}@example.com")->assertUnprocessable();
        }

        $this->verify('123456', 'senki11@example.com')->assertTooManyRequests();
    }

    public function test_an_accented_variant_cannot_get_more_guesses(): void
    {
        $this->resetCode();

        $this->verify('654321', 'pátrik@example.com')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'E-mail cím formátuma érvénytelen.']);

        $this->assertSame(0, $this->guesses());
    }

    public function test_a_stored_address_that_only_folds_to_the_typed_one_is_not_a_match(): void
    {
        $other = Account::factory()->create(['email' => 'straße@example.com']);
        PasswordResetCode::factory()->forAccount($other)->withCode('123456')->create();

        $this->verify('123456', 'strasse@example.com')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);

        $this->assertNull(session('password_reset'));
    }

    public function test_unknown_address_gets_the_invalid_code_answer(): void
    {
        $this->verify('123456', 'senki@example.com')->assertUnprocessable()->assertJsonValidationErrors(['code' => self::INVALID_CODE]);
    }

    #[DataProvider('malformedCodes')]
    public function test_malformed_code_is_refused_without_counting(mixed $code, string $message): void
    {
        $resetCode = $this->resetCode();

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors(['code' => $message]);

        $this->assertDatabaseHas('password_reset_codes', ['id' => $resetCode->id, 'attempts' => 0]);
        $this->assertSame(0, $this->guesses());
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function malformedCodes(): array
    {
        return [
            'too short' => ['12345', 'Kód formátuma érvénytelen.'],
            'letter' => ['12a456', 'Kód formátuma érvénytelen.'],
            'json number (leading zero lost)' => [12345, 'Kód csak szöveg lehet.'],
        ];
    }

    public function test_is_refused_outside_the_website(): void
    {
        $this->resetCode();

        $this->verify('123456', headers: [])
            ->assertForbidden()
            ->assertJson(['message' => 'A jelszó-visszaállítás csak a weboldalról lehetséges.']);
    }
}
