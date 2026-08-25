<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel;

use Illuminate\Support\ServiceProvider;

final class DJPayKitServiceProvider extends ServiceProvider
{
    /**
     * Registers package configuration and future services.
     */
    public function register(): void
    {
        /*
         * Makes config('djpaykit') available while allowing the host
         * application to override published configuration values.
         */
        $this->mergeConfigFrom(
            __DIR__ . '/../config/djpaykit.php',
            'djpaykit',
        );
    }

    /**
     * Publishes files that belong in the host Laravel application.
     */
    public function boot(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        /*
         * Allows installation through:
         * php artisan vendor:publish --tag=djpaykit-config
         */
        $this->publishes([
            __DIR__ . '/../config/djpaykit.php' =>
                config_path('djpaykit.php'),
        ], 'djpaykit-config');

        /*
         * Allows package migrations to be published before running them.
         */
        $this->publishes([
            __DIR__ . '/../database/migrations' =>
                database_path('migrations'),
        ], 'djpaykit-migrations');
    }
}