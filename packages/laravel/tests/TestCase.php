<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests;

use DJLemmor\DJPayKitLaravel\DJPayKitServiceProvider;
use Orchestra\Testbench\TestCase as OrchestraTestCase;

abstract class TestCase extends OrchestraTestCase
{
    /**
     * Registers DJPayKit inside Testbench's temporary Laravel application.
     *
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            DJPayKitServiceProvider::class,
        ];
    }

    /**
 * Runs DJPayKit migrations inside the in-memory test database.
 */
protected function defineDatabaseMigrations(): void
{
    $this->loadMigrationsFrom(
        __DIR__ . '/../database/migrations',
    );
}
}