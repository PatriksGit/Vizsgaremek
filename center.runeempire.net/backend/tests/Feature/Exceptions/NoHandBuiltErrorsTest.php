<?php

namespace Tests\Feature\Exceptions;

use Symfony\Component\Finder\Finder;
use Tests\TestCase;

/**
 * Every API error goes through app/Exceptions: outside it, nothing builds an
 * error by hand. Without this, the handler's generic code would quietly cover
 * a forgotten site (a bare "forbidden" instead of its own code).
 */
class NoHandBuiltErrorsTest extends TestCase
{
    /**
     * @var array<string, string>
     */
    private const array FORBIDDEN = [
        'abort helper' => '/\babort(_if|_unless)?\s*\(/',
        'hand-built JSON error' => '/(response\(\)->json|new\s+JsonResponse)\(\s*\[[^\]]*\'message\'\s*=>/',
        'raw HTTP exception' => '/new\s+\\\\?[\w\\\\]*(HttpException|ThrottleRequestsException)\s*\(/',
    ];

    public function test_no_error_is_built_outside_app_exceptions(): void
    {
        $hits = [];

        foreach (Finder::create()->files()->name('*.php')->in(app_path())->exclude('Exceptions') as $file) {
            foreach (self::hits($file->getContents()) as $hit) {
                $hits[] = "app/{$file->getRelativePathname()}:{$hit}";
            }
        }

        $this->assertSame([], $hits, "Throw an App\\Exceptions class instead:\n".implode("\n", $hits));
    }

    /**
     * The scan sees the project's usual multi-line style too.
     */
    public function test_the_scan_finds_errors_written_over_several_lines(): void
    {
        $source = "<?php\nreturn response()->json(\n    [\n        'message' => 'x',\n    ],\n    503,\n);\n\$a = new JsonResponse(['message' => 'y'], 404);\n";

        $this->assertCount(2, self::hits($source));
    }

    /**
     * Each forbidden construct in a file's source, matched across line
     * breaks, as "<line> <what>".
     *
     * @return list<string>
     */
    private static function hits(string $source): array
    {
        $hits = [];

        foreach (self::FORBIDDEN as $what => $pattern) {
            preg_match_all($pattern, $source, $matches, PREG_OFFSET_CAPTURE);

            foreach ($matches[0] as [$text, $offset]) {
                $hits[] = (substr_count($source, "\n", 0, $offset) + 1)." {$what}: ".trim(strtok($text, "\n"));
            }
        }

        return $hits;
    }
}
