<?php

namespace Tests\Feature\Exceptions;

use Tests\TestCase;

/**
 * Regression test (review 2026-11-17, P-3). The bug it guards against: the bare /api (and /api/, whose path() is also "api") is outside
 * every is('api/*') check: the error contract skips it, and the visitor gets
 * the framework's English 404 ("The route api could not be found.") without a
 * code, or Laravel's English HTML error page in a browser.
 */
class BareApiPathTest extends TestCase
{
    public function test_the_bare_api_path_follows_the_error_contract(): void
    {
        config(['app.debug' => false]);

        foreach (['/api', '/api/'] as $path) {
            $this->getJson($path)
                ->assertNotFound()
                ->assertExactJson(['message' => 'A keresett oldal vagy adat nem található.', 'code' => 'not_found']);
        }

        // A browser typing the address.
        $this->get('/api', ['Accept' => 'text/html'])
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }

    public function test_an_unknown_api_path_follows_the_error_contract(): void
    {
        config(['app.debug' => false]);

        $this->getJson('/api/nincs-ilyen')
            ->assertNotFound()
            ->assertExactJson(['message' => 'A keresett oldal vagy adat nem található.', 'code' => 'not_found']);

        $this->get('/api/nincs-ilyen', ['Accept' => 'text/html'])
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }
}
