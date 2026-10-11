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
     * Indicate the password the player registered with.
     */
    public function withPassword(string $password): static
    {
        return $this->state(fn (array $attributes) => [
            'password_hash' => Hash::make($password),
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
