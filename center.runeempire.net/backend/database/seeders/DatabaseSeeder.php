<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * php artisan db:seed: the website's own sample data (Center only; never the
 * shared auth or plugin databases).
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RankSeeder::class);
    }
}
