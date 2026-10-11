<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Account>
 */
class AccountFactory extends Factory
{
    /**
     * The current password hash being used by the factory.
     */
    protected static ?string $passwordHash;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => fn (array $attributes) => Account::offlineUuid($attributes['display_name']),
            'username' => fn (array $attributes) => Account::usernameFor($attributes['display_name']),
            'display_name' => fake()->unique()->regexify('[A-Za-z][A-Za-z0-9_]{2,15}'),
            'password_hash' => static::$passwordHash ??= Hash::make('password'),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
}
