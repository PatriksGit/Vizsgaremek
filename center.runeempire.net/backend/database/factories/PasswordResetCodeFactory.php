<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\PasswordResetCode;
use App\Support\RegistrationCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PasswordResetCode>
 */
class PasswordResetCodeFactory extends Factory
{
    /**
     * Define the model's default state. The code is 123456.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'account_id' => fn () => Account::factory()->create()->id,
            'code_hash' => RegistrationCode::hash('123456'),
            'expires_at' => now()->addMinutes(15),
        ];
    }

    /**
     * Indicate the account the code was mailed for.
     */
    public function forAccount(Account $account): static
    {
        return $this->state(fn (array $attributes) => [
            'account_id' => $account->id,
        ]);
    }

    /**
     * Indicate the code that was mailed.
     */
    public function withCode(string $code): static
    {
        return $this->state(fn (array $attributes) => [
            'code_hash' => RegistrationCode::hash($code),
        ]);
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
}
