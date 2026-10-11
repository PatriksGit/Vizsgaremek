<?php

use App\Support\YamlEnv;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

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
    ->create();

$app->afterLoadingEnvironment(
    fn () => YamlEnv::load($app->basePath('config.yml'), YamlEnv::repository()),
);

return $app;
