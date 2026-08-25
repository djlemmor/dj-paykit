<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Console;

use DJLemmor\DJPayKitLaravel\DJPayKitServiceProvider;
use Illuminate\Console\Command;

final class InstallCommand extends Command
{
    /**
     * The command name and supported options.
     *
     * @var string
     */
    protected $signature = 'djpaykit:install
        {--force : Overwrite previously published DJPayKit files}';

    /**
     * The command description displayed by Artisan.
     *
     * @var string
     */
    protected $description =
        'Publish the DJPayKit configuration and database migrations.';

    /**
     * Publishes the files needed by a host Laravel application.
     */
    public function handle(): int
    {
        $this->info('Installing DJPayKit...');

        $commonArguments = [
            /*
             * Limits publishing to resources registered by DJPayKit's
             * service provider.
             */
            '--provider' => DJPayKitServiceProvider::class,
        ];

        if ((bool) $this->option('force')) {
            $commonArguments['--force'] = true;
        }

        $configResult = $this->call(
            'vendor:publish',
            [
                ...$commonArguments,
                '--tag' => 'djpaykit-config',
            ],
        );

        if ($configResult !== self::SUCCESS) {
            $this->error(
                'DJPayKit configuration could not be published.',
            );

            return self::FAILURE;
        }

        $migrationResult = $this->call(
            'vendor:publish',
            [
                ...$commonArguments,
                '--tag' => 'djpaykit-migrations',
            ],
        );

        if ($migrationResult !== self::SUCCESS) {
            $this->error(
                'DJPayKit migrations could not be published.',
            );

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('DJPayKit files were published successfully.');

        /*
         * The package does not run migrations automatically because the
         * host application's owner should control database changes.
         */
        $this->line(
            'Next, review the published files and run: php artisan migrate',
        );

        return self::SUCCESS;
    }
}