<?php

namespace Tests\Feature\Exceptions;

use App\Exceptions\ApiErrorResponse;
use App\Exceptions\ApiException;
use ReflectionClass;
use Tests\Support\ErrorCatalogue;
use Tests\TestCase;

/**
 * Every error code the API can answer with: unique, in the agreed format,
 * and declared by each exception class, so a new error is one small class.
 */
class ErrorCatalogueTest extends TestCase
{
    private const string PATTERN = '/\A([a-z][a-z_]*\.)?[a-z][a-z_]*\z/';

    public function test_every_api_exception_declares_code_and_status(): void
    {
        foreach (ErrorCatalogue::exceptionClasses() as $class) {
            $reflection = new ReflectionClass($class);

            // Declared by the class itself, not the base class's placeholders.
            $this->assertSame($class, $reflection->getReflectionConstant('CODE')?->getDeclaringClass()->getName(), "{$class} must declare CODE");
            $this->assertSame($class, $reflection->getReflectionConstant('STATUS')?->getDeclaringClass()->getName(), "{$class} must declare STATUS");
            $this->assertGreaterThanOrEqual(400, $class::STATUS, "{$class}::STATUS");
        }
    }

    public function test_codes_are_unique_and_match_the_pattern(): void
    {
        $codes = ErrorCatalogue::codes();

        $this->assertContains('validation_failed', $codes);
        $this->assertSame(array_unique($codes), $codes, 'duplicate codes: '.implode(', ', array_diff_assoc($codes, array_unique($codes))));

        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression(self::PATTERN, $code);
        }
    }

    public function test_own_codes_are_area_prefixed(): void
    {
        foreach (ErrorCatalogue::exceptionClasses() as $class) {
            $this->assertStringContainsString('.', $class::CODE, "{$class}::CODE needs an area prefix");
            $this->assertArrayNotHasKey($class::CODE, ApiErrorResponse::GENERIC);
            $this->assertTrue(is_subclass_of($class, ApiException::class));
        }
    }
}
