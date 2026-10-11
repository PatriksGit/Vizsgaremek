<?php

use App\Support\YamlEnv;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Website requests (Sanctum stateful origins) get the session and CSRF protection.
        $middleware->statefulApi();

        // An API has no login page: guests get a JSON 401, never a redirect.
        $middleware->redirectGuestsTo(fn () => null);

        // Only the client IP and the original scheme are taken from the proxy;
        // X-Forwarded-Host/Port/Prefix stay untrusted, so a client cannot change url().
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Sessions live in Redis; when it is down, players get a plain message
        // (the exception is still reported to the log).
        $exceptions->render(fn (RedisException $exception) => response()->json(['message' => 'Váratlan hiba történt.'], 500));
    })
    ->booted(function (): void {
        // Each limit needs its own key, or they would share one counter.
        RateLimiter::for('register', fn (Request $request) => [
            Limit::perMinute(config('rate_limits.register.per_minute'))->by('minute:'.$request->ip()),
            Limit::perHour(config('rate_limits.register.per_hour'))->by('hour:'.$request->ip()),
        ]);

        RateLimiter::for('register-verify', fn (Request $request) => Limit::perMinute(config('rate_limits.register_verify.per_minute'))->by($request->ip()));

        RateLimiter::for('login', function (Request $request): array {
            $username = $request->input('username');
            $usernameKey = is_string($username) ? mb_strtolower($username) : '';

            return [
                Limit::perMinute(config('rate_limits.login.per_minute'))->by('user:'.$usernameKey.'|'.$request->ip()),
                Limit::perMinute(config('rate_limits.login.per_minute_per_ip'))->by('ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('password-change', fn (Request $request) => Limit::perMinute(config('rate_limits.password_change.per_minute'))->by('account:'.$request->user()?->getAuthIdentifier()));
    })
    ->create();

$app->afterLoadingEnvironment(
    fn () => YamlEnv::load($app->basePath('config.yml'), YamlEnv::repository()),
);

return $app;
