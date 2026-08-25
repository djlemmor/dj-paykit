<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Unit;

use DJLemmor\DJPayKitLaravel\Tests\TestCase;

final class ConfigurationTest extends TestCase
{
    public function test_it_registers_the_default_configuration(): void
    {
        // Confirms the service provider merged the package configuration.
        $this->assertSame(
            'api/djpaykit',
            config('djpaykit.route_prefix'),
        );

        $this->assertSame(
            'PHP',
            config('djpaykit.default_currency'),
        );

        $this->assertFalse(
            config('djpaykit.show_account_number_by_default'),
        );

        $this->assertFalse(
            config('djpaykit.proof_of_payment_enabled'),
        );
    }

    public function test_it_registers_the_initial_providers(): void
    {
        // Confirms all MVP providers are configured centrally.
        $this->assertSame(
            ['gcash', 'maya', 'maribank'],
            array_keys(config('djpaykit.providers')),
        );

        $this->assertSame(
            'MariBank',
            config('djpaykit.providers.maribank.display_name'),
        );
    }
}