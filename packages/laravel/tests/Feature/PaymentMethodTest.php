<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class PaymentMethodTest extends TestCase
{
    public function test_it_creates_the_payment_methods_table(): void
    {
        // Confirms that all required MVP columns were created.
        $this->assertTrue(
            Schema::hasColumns(
                'djpaykit_payment_methods',
                [
                    'id',
                    'provider',
                    'display_name',
                    'account_name',
                    'account_number',
                    'qr_image_path',
                    'instructions',
                    'show_account_number',
                    'is_enabled',
                    'sort_order',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ),
        );
    }

    public function test_it_stores_a_payment_method(): void
    {
        $paymentMethod = PaymentMethod::query()->create([
            'provider' => 'gcash',
            'display_name' => 'GCash',
            'account_name' => 'DJ Business',
            'account_number' => '0912 345 6789',
            'qr_image_path' => 'djpaykit/qr-codes/gcash.png',
            'instructions' => 'Include your order number.',
            'show_account_number' => false,
            'is_enabled' => true,
            'sort_order' => 10,
        ]);

        /*
        * Uses Laravel's validator so both valid uppercase and lowercase
        * ULID representations are accepted.
        */
        $this->assertTrue(
            Str::isUlid($paymentMethod->id),
        );

        // Confirms that model casts return proper PHP values.
        $this->assertFalse($paymentMethod->show_account_number);
        $this->assertTrue($paymentMethod->is_enabled);
        $this->assertSame(10, $paymentMethod->sort_order);

        $this->assertDatabaseHas(
            'djpaykit_payment_methods',
            [
                'id' => $paymentMethod->id,
                'provider' => 'gcash',
                'account_name' => 'DJ Business',
            ],
        );
    }

    public function test_it_soft_deletes_a_payment_method(): void
    {
        $paymentMethod = PaymentMethod::query()->create([
            'provider' => 'maya',
            'display_name' => 'Maya',
            'account_name' => 'DJ Business',
            'qr_image_path' => 'djpaykit/qr-codes/maya.png',
        ]);

        // Keeps the database row available for recovery and auditing.
        $paymentMethod->delete();

        $this->assertSoftDeleted(
            'djpaykit_payment_methods',
            [
                'id' => $paymentMethod->id,
            ],
        );

        // Normal queries should hide deleted payment methods.
        $this->assertNull(
            PaymentMethod::query()->find($paymentMethod->id),
        );

        // The record remains accessible through withTrashed().
        $this->assertNotNull(
            PaymentMethod::withTrashed()->find($paymentMethod->id),
        );
    }
}