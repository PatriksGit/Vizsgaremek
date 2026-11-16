<?php

use App\Exceptions\ApiErrorResponse;
use App\Http\Middleware\LogOutBlockedAccounts;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Website requests (Sanctum stateful origins) get the session and CSRF protection.
        $middleware->statefulApi();

        // After the session has started: a session whose account was locked meanwhile ends.
        $middleware->api(append: [LogOutBlockedAccounts::class]);
        // ...and before auth:sanctum, which the framework would otherwise sort
        // ahead of it: the blocked session's request must reach it as a guest's.
        $middleware->prependToPriorityList(AuthenticatesRequests::class, LogOutBlockedAccounts::class);

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
        $exceptions->render(fn (RedisException $exception) => ApiErrorResponse::make('server_error', 'Váratlan hiba történt.', 500));

        // The framework's own 419 message is a fixed English string.
        $exceptions->render(fn (HttpException $exception, Request $request) => $exception->getStatusCode() === 419 && $request->is('api/*')
            ? ApiErrorResponse::make('session_expired', 'A munkamenet lejárt. Frissítsd az oldalt, és próbáld újra.', 419)
            : null);

        // Every other API error gets its status's generic code (our own
        // exceptions in app/Exceptions bring their own).
        $exceptions->respond(ApiErrorResponse::finalize(...));
    })
    // Runs only if the server's cron calls `php artisan schedule:run` every minute.
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('cache:prune-expired')->daily();
    })
    ->create();
