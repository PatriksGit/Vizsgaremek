<?php

namespace Tests\Support;

use App\Exceptions\ApiErrorResponse;
use App\Exceptions\ApiException;
use ReflectionClass;
use Symfony\Component\Finder\Finder;

/**
 * The API's error codes, read from the code itself: the generic list next to
 * the response builder, plus the CODE of every exception class under
 * app/Exceptions.
 */
final class ErrorCatalogue
{
    /**
     * @return list<string>
     */
    public static function codes(): array
    {
        return [
            ...array_keys(ApiErrorResponse::GENERIC),
            ...array_map(fn (string $class): string => $class::CODE, self::exceptionClasses()),
        ];
    }

    /**
     * Every concrete ApiException subclass in app/Exceptions.
     *
     * @return list<class-string<ApiException>>
     */
    public static function exceptionClasses(): array
    {
        $classes = [];

        foreach (Finder::create()->files()->name('*.php')->in(app_path('Exceptions')) as $file) {
            $class = 'App\\Exceptions\\'.str_replace(['/', '.php'], ['\\', ''], $file->getRelativePathname());

            if (is_subclass_of($class, ApiException::class) && ! (new ReflectionClass($class))->isAbstract()) {
                $classes[] = $class;
            }
        }

        sort($classes);

        return $classes;
    }
}
