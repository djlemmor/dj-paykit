<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Unit;

use DJLemmor\DJPayKitLaravel\Rules\SupportedProvider;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Support\Facades\Validator;

final class SupportedProviderTest extends TestCase
{
    public function test_it_accepts_a_configured_provider(): void
    {
        $validator = Validator::make(
            ['provider' => 'gcash'],
            ['provider' => [new SupportedProvider()]],
        );

        $this->assertFalse($validator->fails());
    }

    public function test_it_rejects_an_unknown_provider(): void
    {
        $validator = Validator::make(
            ['provider' => 'unknown-wallet'],
            ['provider' => [new SupportedProvider()]],
        );

        $this->assertTrue($validator->fails());
    }

    public function test_it_accepts_a_provider_added_by_the_host_app(): void
    {
        /*
         * Demonstrates that future providers can be added through
         * configuration without editing the package source code.
         */
        config()->set(
            'djpaykit.providers.instapay',
            ['display_name' => 'InstaPay'],
        );

        $validator = Validator::make(
            ['provider' => 'instapay'],
            ['provider' => [new SupportedProvider()]],
        );

        $this->assertFalse($validator->fails());
    }
}