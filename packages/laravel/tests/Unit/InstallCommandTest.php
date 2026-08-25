<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Unit;

use DJLemmor\DJPayKitLaravel\Console\InstallCommand;
use DJLemmor\DJPayKitLaravel\DJPayKitServiceProvider;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Support\Facades\Artisan;

final class InstallCommandTest extends TestCase
{
    public function test_it_registers_the_installation_command(): void
    {
        $commands = Artisan::all();

        $this->assertArrayHasKey(
            'djpaykit:install',
            $commands,
        );

        $this->assertInstanceOf(
            InstallCommand::class,
            $commands['djpaykit:install'],
        );

        $this->assertTrue(
            $commands['djpaykit:install']
                ->getDefinition()
                ->hasOption('force'),
        );
    }

    public function test_it_registers_publishable_installation_files(): void
    {
        /*
         * Checks publishing registrations without writing files into
         * Testbench's temporary Laravel application.
         */
        $configPaths =
            DJPayKitServiceProvider::pathsToPublish(
                DJPayKitServiceProvider::class,
                'djpaykit-config',
            );

        $migrationPaths =
            DJPayKitServiceProvider::pathsToPublish(
                DJPayKitServiceProvider::class,
                'djpaykit-migrations',
            );

        $this->assertNotEmpty($configPaths);
        $this->assertNotEmpty($migrationPaths);
    }
}