<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Exceptions;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use RedisException;
use Tests\TestCase;

#[RequiresPhpExtension('redis')]
class RedisOutageTest extends TestCase
{
    public function test_unreachable_redis_gives_a_generic_500(): void
    {
        Exceptions::fake();
        config([
            'session.driver' => 'redis',
            'database.redis.default.host' => '127.0.0.1',
            'database.redis.default.port' => 1,
        ]);

        $this->postJson('/api/auth/login', ['username' => 'PatrikT', 'password' => 'titkos-jelszo'], ['Origin' => 'http://localhost:5173'])
            ->assertInternalServerError()
            ->assertExactJson(['message' => 'Váratlan hiba történt.']);

        Exceptions::assertReported(RedisException::class);
    }
}
