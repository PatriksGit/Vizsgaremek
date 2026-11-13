<?php

namespace App\Support;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SkinTextures
{
    /**
     * How long a failed download is remembered: a page of heads during a
     * Mojang outage then waits for one timeout, not one per head.
     */
    private const int FAILURE_CACHE_SECONDS = 60;

    /**
     * A skin file is a small PNG; anything bigger is not one.
     */
    private const int MAX_BYTES = 64 * 1024;

    /**
     * The PNG of a Mojang skin texture, or null when it cannot be had now.
     *
     * A texture never changes under its hash, so each is downloaded once and
     * kept. It is stored base64-encoded: the server's cache is a database
     * table with a text column, which raw image bytes would not survive.
     */
    public function png(string $hash): ?string
    {
        $key = "skin-texture:{$hash}";
        $cached = Cache::get($key);

        if ($cached === null) {
            $png = $this->download($hash);

            if ($png === null) {
                Cache::put($key, false, self::FAILURE_CACHE_SECONDS);

                return null;
            }

            Cache::forever($key, base64_encode($png));

            return $png;
        }

        return is_string($cached) ? (string) base64_decode($cached, true) : null;
    }

    private function download(string $hash): ?string
    {
        try {
            $response = Http::timeout(5)->get("https://textures.minecraft.net/texture/{$hash}");
        } catch (ConnectionException) {
            return null;
        }

        $body = $response->body();

        return $response->successful() && strlen($body) <= self::MAX_BYTES && self::isSkinImage($body) ? $body : null;
    }

    /**
     * Whether the bytes are a PNG of a skin's size: 64x64, or 64x32 for the
     * skins made before Minecraft 1.8. Read from the PNG header, no image library needed.
     */
    private static function isSkinImage(string $bytes): bool
    {
        if (! str_starts_with($bytes, "\x89PNG\r\n\x1a\n") || substr($bytes, 12, 4) !== 'IHDR') {
            return false;
        }

        /** @var array{width: int, height: int} $size */
        $size = unpack('Nwidth/Nheight', substr($bytes, 16, 8));

        return $size['width'] === 64 && in_array($size['height'], [64, 32], true);
    }
}
