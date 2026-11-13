<?php

namespace App\Providers;

use App\Auth\ProcedureUserProvider;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the "procedures" user provider driver that config/auth.php uses,
 * so logins and sessions load accounts through the stored procedures.
 */
class AuthServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::provider('procedures', fn (Application $app): ProcedureUserProvider => $app->make(ProcedureUserProvider::class));
    }
}
