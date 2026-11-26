<?php

namespace Database\Factories;

use App\Models\ManagementAction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ManagementAction>
 */
class ManagementActionFactory extends Factory
{
    /**
     * Define the model's default state: an e-mail change by "Boss".
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'manager_account_id' => 1,
            'manager_name' => 'Boss',
            'manager_email' => 'boss@example.com',
            'action' => ManagementAction::EMAIL_CHANGED,
            'target_account_id' => 2,
            'target_name' => 'Steve',
            'old_value' => fake()->safeEmail(),
            'new_value' => fake()->safeEmail(),
        ];
    }
}
