<?php

namespace App\Http\Middleware;

use App\Exceptions\Management\NotAllowed;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The Google sign-in's two routes are opened as full pages, not by the
 * frontend's API calls, so a JSON error body would end up on the screen.
 * Every API error there (an expired login's 401, the throttle's 429, our
 * own 403 / 503) becomes a redirect to the frontend: 401 to the login page,
 * anything else to /management?error=<code>, which the frontend maps to its
 * own text. Only management.not_allowed also carries the address Google
 * returned. It runs outside the session and auth middleware (bootstrap/app.php).
 */
class ManagementPageErrors
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $response instanceof JsonResponse || $response->getStatusCode() < 400) {
            return $response;
        }

        $body = $response->getData(true);
        $code = is_array($body) ? ($body['code'] ?? null) : null;
        if (! is_string($code)) {
            return $response;
        }

        $frontend = config('management.frontend_url');

        if ($response->getStatusCode() === 401) {
            return $this->withCookiesOf($response, redirect()->away($frontend.'/login'));
        }

        $query = ['error' => $code];
        if ($code === NotAllowed::CODE && is_string($body['details']['email'] ?? null)) {
            $query['email'] = $body['details']['email'];
        }

        return $this->withCookiesOf($response, redirect()->away($frontend.'/management?'.http_build_query($query)));
    }

    /**
     * The session middleware ran inside this one: its cookie stays on the redirect.
     */
    private function withCookiesOf(Response $response, Response $redirect): Response
    {
        foreach ($response->headers->getCookies() as $cookie) {
            $redirect->headers->setCookie($cookie);
        }

        return $redirect;
    }
}
