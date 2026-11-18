<?php

namespace App\Providers;

use App\Exceptions\Players\PlayerNotFound;
use App\Models\Account;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * How route parameters find their models. Here, not in routes/api.php:
 * with `php artisan route:cache` (run on deploy) the route files are never
 * loaded, so a Route::bind there would be lost and {player} would fall back
 * to finding the account by its id.
 */
class RouteBindingServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // {player} is a player name, looked up the way accounts store it (lowercase); none is players.not_found.
        Route::bind('player', fn (string $name): Account => Account::query()->where('username', Account::usernameFor($name))->first()
            ?? throw new PlayerNotFound);
    }
}
