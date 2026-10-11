<?php

namespace App\Providers;

use App\Models\Account;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * The named rate limiters behind the routes' throttle:... middleware. The
 * numbers come from config/rate_limits.php (config.yml's rate-limits section).
 * Within one limiter every limit needs its own key, or they would share one counter.
 */
class RateLimitServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('register', fn (Request $request): array => [
            Limit::perMinute(config('rate_limits.register.per_minute'))->by('minute:'.$request->ip()),
            Limit::perHour(config('rate_limits.register.per_hour'))->by('hour:'.$request->ip()),
        ]);

        RateLimiter::for('register-verify', fn (Request $request): Limit => Limit::perMinute(config('rate_limits.register_verify.per_minute'))->by($request->ip()));

        RateLimiter::for('login', function (Request $request): array {
            $username = $request->input('username');
            $usernameKey = is_string($username) ? Account::usernameFor($username) : '';

            return [
                Limit::perMinute(config('rate_limits.login.per_minute'))->by('user:'.$usernameKey.'|'.$request->ip()),
                Limit::perMinute(config('rate_limits.login.per_minute_per_ip'))->by('ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('password-change', fn (Request $request): Limit => Limit::perMinute(config('rate_limits.password_change.per_minute'))->by('account:'.$request->user()?->getAuthIdentifier()));
    }
}
