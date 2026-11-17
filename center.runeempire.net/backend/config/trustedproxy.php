<?php

/*
 * Proxies whose X-Forwarded-For / X-Forwarded-Proto headers are trusted, from
 * TRUSTED_PROXIES in .env (comma-separated).
 * In production this is the Cloudflare Tunnel's cloudflared, which forwards
 * every request from 127.0.0.1 (or the Docker bridge gateway if the backend
 * runs in a container).
 * An empty value would trust no proxy: every visitor would be 127.0.0.1 and
 * share one budget in every per-IP rate limit. It falls back to the default.
 */
return [

    'proxies' => trim((string) env('TRUSTED_PROXIES')) ?: '127.0.0.1',

];
