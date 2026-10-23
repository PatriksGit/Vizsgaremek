<?php

namespace App\Providers;

use App\Models\Account;
use Closure;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * The named rate limiters behind the routes' throttle:... middleware. The
 * numbers come from config/rate_limits.php (the RATE_LIMITS_* lines in .env).
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
            Limit::perMinute(config('rate_limits.register.per_minute'))->by('minute:'.$request->ip())->response(self::tooManyAttempts()),
            Limit::perHour(config('rate_limits.register.per_hour'))->by('hour:'.$request->ip())->response(self::tooManyAttempts()),
        ]);

        RateLimiter::for('register-verify', fn (Request $request): Limit => Limit::perMinute(config('rate_limits.register_verify.per_minute'))->by($request->ip())->response(self::tooManyAttempts()));

        RateLimiter::for('login', function (Request $request): array {
            $username = $request->input('username');
            $usernameKey = is_string($username) ? Account::usernameFor($username) : '';

            return [
                Limit::perMinute(config('rate_limits.login.per_minute'))->by('user:'.$usernameKey.'|'.$request->ip())->response(self::tooManyAttempts()),
                Limit::perMinute(config('rate_limits.login.per_minute_per_ip'))->by('ip:'.$request->ip())->response(self::tooManyAttempts()),
            ];
        });

        RateLimiter::for('password-change', fn (Request $request): Limit => Limit::perMinute(config('rate_limits.password_change.per_minute'))->by('account:'.$request->user()?->getAuthIdentifier())->response(self::tooManyAttempts()));
    }

    /**
     * The 429 answer in Hungarian, with the wait from Retry-After: the
     * framework's own "Too Many Attempts." is a fixed English string.
     *
     * @return Closure(Request, array<string, int|string>): JsonResponse
     */
    private static function tooManyAttempts(): Closure
    {
        return function (Request $request, array $headers): JsonResponse {
            $seconds = (int) $headers['Retry-After'];
            $wait = $seconds < 60 ? $seconds.' másodperc' : (int) ceil($seconds / 60).' perc';

            return response()->json(['message' => "Túl sok próbálkozás. Próbáld újra {$wait} múlva."], 429, $headers);
        };
    }
}
