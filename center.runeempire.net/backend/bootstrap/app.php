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
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->booted(function (): void {
        // Each limit needs its own key, or they would share one counter.
        RateLimiter::for('register', fn (Request $request) => [
            Limit::perMinute(config('rate_limits.register.per_minute'))->by('minute:'.$request->ip()),
            Limit::perHour(config('rate_limits.register.per_hour'))->by('hour:'.$request->ip()),
        ]);

        RateLimiter::for('register-verify', fn (Request $request) => Limit::perMinute(config('rate_limits.register_verify.per_minute'))->by($request->ip()));
    })
    ->create();

$app->afterLoadingEnvironment(
    fn () => YamlEnv::load($app->basePath('config.yml'), YamlEnv::repository()),
);

return $app;
