<?php

namespace Tests\Unit;

use App\Support\YamlEnv;
use Dotenv\Repository\Adapter\ArrayAdapter;
use Dotenv\Repository\RepositoryBuilder;
use Dotenv\Repository\RepositoryInterface;
use PHPUnit\Framework\TestCase;

class YamlEnvTest extends TestCase
{
    private string $path;

    protected function setUp(): void
    {
        parent::setUp();

        $this->path = tempnam(sys_get_temp_dir(), 'yamlenv').'.yml';
    }

    protected function tearDown(): void
    {
        @unlink($this->path);

        parent::tearDown();
    }

    public function test_nested_keys_are_flattened_into_upper_snake_case_variables(): void
    {
        file_put_contents($this->path, <<<'YAML'
            app:
              name: RuneEmpire Center
            database:
              global:
                host: 127.0.0.1
                port: 3306
            argon2:
              memory-kib: 131072
            YAML);

        $repository = $this->repository();
        YamlEnv::load($this->path, $repository);

        $this->assertSame('RuneEmpire Center', $repository->get('APP_NAME'));
        $this->assertSame('127.0.0.1', $repository->get('DATABASE_GLOBAL_HOST'));
        $this->assertSame('3306', $repository->get('DATABASE_GLOBAL_PORT'));
        $this->assertSame('131072', $repository->get('ARGON2_MEMORY_KIB'));
    }

    public function test_booleans_nulls_and_lists_become_strings_env_understands(): void
    {
        file_put_contents($this->path, <<<'YAML'
            app:
              debug: false
            mail:
              username: ~
            cors:
              allowed-origins:
                - http://localhost:5173
                - https://center.runeempire.net
            YAML);

        $repository = $this->repository();
        YamlEnv::load($this->path, $repository);

        $this->assertSame('false', $repository->get('APP_DEBUG'));
        $this->assertSame('null', $repository->get('MAIL_USERNAME'));
        $this->assertSame('http://localhost:5173,https://center.runeempire.net', $repository->get('CORS_ALLOWED_ORIGINS'));
    }

    public function test_already_defined_variables_are_not_overwritten(): void
    {
        file_put_contents($this->path, "app:\n  env: production\n");

        $repository = $this->repository(['APP_ENV' => 'testing']);
        YamlEnv::load($this->path, $repository);

        $this->assertSame('testing', $repository->get('APP_ENV'));
    }

    public function test_missing_file_is_skipped(): void
    {
        $repository = $this->repository();

        YamlEnv::load($this->path.'.missing', $repository);

        $this->assertNull($repository->get('APP_NAME'));
    }

    /**
     * @param  array<string, string>  $externallyDefined  variables set before loading, e.g. by phpunit.xml
     */
    private function repository(array $externallyDefined = []): RepositoryInterface
    {
        $adapter = ArrayAdapter::create()->get();

        foreach ($externallyDefined as $name => $value) {
            $adapter->write($name, $value);
        }

        return RepositoryBuilder::createWithNoAdapters()
            ->addAdapter($adapter)
            ->immutable()
            ->make();
    }
}
