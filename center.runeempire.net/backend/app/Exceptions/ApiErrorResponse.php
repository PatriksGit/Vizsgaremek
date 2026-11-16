<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * The one place that builds an API error body:
 * { message, code, errors?, details? }.
 *
 * `message` is the Hungarian text shown to the player, `code` the stable,
 * machine-readable reason the frontend decides on (never renamed once
 * published), `errors` Laravel's field map, `details` any extra data of
 * that code. Our own errors are ApiException classes; GENERIC lists the
 * codes for everything else.
 */
final class ApiErrorResponse
{
    /**
     * The codes of errors that are not our own exceptions, by status (null:
     * any other 4xx / 5xx), with the Hungarian text they get. Only Laravel's
     * validation messages are kept; our 401, 419 and named-limiter 429
     * renderers bring their own code and text, so these defaults are for
     * everything else (a bare throttle:x,y route, a stray HttpException).
     *
     * @var array<string, array{status: int|null, message: string}>
     */
    public const array GENERIC = [
        'validation_failed' => ['status' => 422, 'message' => 'Az elküldött adatok hibásak.'],
        'unauthenticated' => ['status' => 401, 'message' => 'Ehhez be kell jelentkezned.'],
        'session_expired' => ['status' => 419, 'message' => 'A munkamenet lejárt. Frissítsd az oldalt, és próbáld újra.'],
        'too_many_requests' => ['status' => 429, 'message' => 'Túl sok próbálkozás, próbáld újra később.'],
        'forbidden' => ['status' => 403, 'message' => 'Ehhez nincs jogosultságod.'],
        'not_found' => ['status' => 404, 'message' => 'A keresett oldal vagy adat nem található.'],
        'method_not_allowed' => ['status' => 405, 'message' => 'Ez a kérés itt nem engedélyezett.'],
        'service_unavailable' => ['status' => 503, 'message' => 'A szolgáltatás most nem érhető el, próbáld újra később.'],
        'bad_request' => ['status' => null, 'message' => 'Hibás kérés.'],
        'server_error' => ['status' => null, 'message' => 'Váratlan hiba történt.'],
    ];

    /**
     * @param  array<string, string|int>  $headers
     * @param  array<string, list<string>>|null  $errors
     * @param  array<string, mixed>  $details
     */
    public static function make(string $code, string $message, int $status, array $headers = [], ?array $errors = null, array $details = []): JsonResponse
    {
        $body = ['message' => $message, 'code' => $code];

        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        if ($details !== []) {
            $body['details'] = $details;
        }

        return response()->json($body, $status, $headers);
    }

    /**
     * The exception handler's last step (bootstrap/app.php, respond()): an
     * api/* JSON error without a code of its own gets its status's generic
     * code and Hungarian text. Only a ValidationException keeps its message
     * (Laravel's, from lang/hu). A 500 keeps its debug body while APP_DEBUG
     * is on (the frontend never shows a server_error message).
     */
    public static function finalize(Response $response, Throwable $exception, Request $request): Response
    {
        if (! $request->is('api/*') || ! $response instanceof JsonResponse || $response->getStatusCode() < 400) {
            return $response;
        }

        $body = $response->getData(true);

        if (! is_array($body) || isset($body['code'])) {
            return $response;
        }

        $code = self::genericCodeFor($response->getStatusCode());
        $default = self::GENERIC[$code]['message'];

        if ($code === 'server_error') {
            if (! config('app.debug')) {
                $body = ['message' => $default];
            }
        } elseif (! $exception instanceof ValidationException) {
            $body['message'] = $default;
        }

        $body['code'] = $code;

        return $response->setData($body);
    }

    /**
     * The generic code of a status: its own entry, else bad_request for a
     * 4xx and server_error for anything else.
     */
    public static function genericCodeFor(int $status): string
    {
        foreach (self::GENERIC as $code => $entry) {
            if ($entry['status'] === $status) {
                return $code;
            }
        }

        return $status < 500 ? 'bad_request' : 'server_error';
    }
}
