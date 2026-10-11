<?php

namespace App\Support;

use Dotenv\Repository\Adapter\EnvConstAdapter;
use Dotenv\Repository\Adapter\PutenvAdapter;
use Dotenv\Repository\Adapter\ServerConstAdapter;
use Dotenv\Repository\RepositoryBuilder;
use Dotenv\Repository\RepositoryInterface;
use Symfony\Component\Yaml\Yaml;

/**
 * Loads config.yml into environment variables, replacing the .env file.
 *
 * Nested keys are joined into upper snake case, so `db.global.host`
 * becomes DB_GLOBAL_HOST and `password.argon2.memory-kib` becomes
 * PASSWORD_ARGON2_MEMORY_KIB; the config files keep reading them through env().
 * Variables that are already set (real environment, phpunit.xml) win.
 */
class YamlEnv
{
    /**
     * A repository that writes only $_SERVER, which env() reads.
     *
     * Values in putenv() or $_ENV are inherited by child processes, so
     * `php artisan test` would hand config.yml's real database to phpunit
     * (whose <env> entries do not override inherited values), and
     * `php artisan serve` would keep serving stale values after an edit.
     */
    public static function repository(): RepositoryInterface
    {
        return RepositoryBuilder::createWithNoAdapters()
            ->addAdapter(ServerConstAdapter::class)
            ->addReader(EnvConstAdapter::class)
            ->addReader(PutenvAdapter::class)
            ->immutable()
            ->make();
    }

    public static function load(string $path, RepositoryInterface $repository): void
    {
        if (! is_file($path)) {
            return;
        }

        foreach (self::flatten(Yaml::parseFile($path) ?? []) as $name => $value) {
            $repository->set($name, $value);
        }
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<string, string>
     */
    private static function flatten(array $values, string $prefix = ''): array
    {
        $variables = [];

        foreach ($values as $key => $value) {
            $name = $prefix.strtoupper(str_replace('-', '_', (string) $key));

            if (is_array($value) && ! array_is_list($value)) {
                $variables += self::flatten($value, $name.'_');

                continue;
            }

            $variables[$name] = match (true) {
                is_array($value) => implode(',', $value),
                is_bool($value) => $value ? 'true' : 'false',
                $value === null => 'null',
                default => (string) $value,
            };
        }

        return $variables;
    }
}
