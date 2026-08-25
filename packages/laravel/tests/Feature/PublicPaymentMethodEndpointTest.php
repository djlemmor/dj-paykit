<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class PublicPaymentMethodEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Prevents tests from accessing the real configured disk.
        Storage::fake('djpaykit-test');

        config()->set(
            'djpaykit.storage_disk',
            'djpaykit-test',
        );

        // Public endpoint tests do not need host API middleware.
        $this->withoutMiddleware();
    }

    public function test_it_lists_only_enabled_payment_methods(): void
    {
        $maya = PaymentMethod::query()->create([
            'provider' => 'maya',
            'display_name' => 'Maya',
            'account_name' => 'DJ Business',
            'account_number' => '0912 345 6789',
            'qr_image_path' =>
                'djpaykit/qr-codes/maya/maya.png',
            'show_account_number' => true,
            'is_enabled' => true,
            'sort_order' => 20,
        ]);

        $gcash = PaymentMethod::query()->create([
            'provider' => 'gcash',
            'display_name' => 'GCash',
            'account_name' => 'DJ Business',
            'account_number' => '0999 111 2222',
            'qr_image_path' =>
                'djpaykit/qr-codes/gcash/gcash.png',
            'show_account_number' => false,
            'is_enabled' => true,
            'sort_order' => 10,
        ]);

        PaymentMethod::query()->create([
            'provider' => 'maribank',
            'display_name' => 'MariBank',
            'account_name' => 'DJ Business',
            'qr_image_path' =>
                'djpaykit/qr-codes/maribank/maribank.png',
            'is_enabled' => false,
            'sort_order' => 5,
        ]);

        $response = $this->getJson(
            '/api/djpaykit/payment-methods',
        );

        $response->assertOk();

        $data = $response->json('data');

        $this->assertIsArray($data);
        $this->assertCount(2, $data);

        // Enabled methods are ordered by sort_order.
        $this->assertSame('gcash', $data[0]['provider']);
        $this->assertSame('maya', $data[1]['provider']);

        // GCash has not enabled public account-number display.
        $this->assertNull($data[0]['accountNumber']);

        // Maya explicitly enabled its account number.
        $this->assertSame(
            '0912 345 6789',
            $data[1]['accountNumber'],
        );

        $this->assertStringEndsWith(
            '/api/djpaykit/payment-methods/' .
                $gcash->id .
                '/qr',
            $data[0]['qrImageUrl'],
        );

        $this->assertStringEndsWith(
            '/api/djpaykit/payment-methods/' .
                $maya->id .
                '/qr',
            $data[1]['qrImageUrl'],
        );

        // Private storage paths must never appear in the API.
        $this->assertArrayNotHasKey(
            'qrImagePath',
            $data[0],
        );

        $this->assertArrayNotHasKey(
            'isEnabled',
            $data[0],
        );
    }

    public function test_it_serves_an_enabled_qr_image(): void
    {
        $path = 'djpaykit/qr-codes/gcash/test.png';
        $png = $this->pngContents();

        Storage::disk('djpaykit-test')->put(
            $path,
            $png,
        );

        $paymentMethod = PaymentMethod::query()->create([
            'provider' => 'gcash',
            'display_name' => 'GCash',
            'account_name' => 'DJ Business',
            'qr_image_path' => $path,
            'is_enabled' => true,
        ]);

        $response = $this->get(
            '/api/djpaykit/payment-methods/' .
                $paymentMethod->id .
                '/qr',
        );

        $response
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'image/png',
            )
            ->assertHeader(
                'X-Content-Type-Options',
                'nosniff',
            );

        $this->assertSame(
            $png,
            $response->getContent(),
        );
    }

    public function test_it_hides_a_disabled_payment_method_qr(): void
    {
        $path = 'djpaykit/qr-codes/maya/disabled.png';

        Storage::disk('djpaykit-test')->put(
            $path,
            $this->pngContents(),
        );

        $paymentMethod = PaymentMethod::query()->create([
            'provider' => 'maya',
            'display_name' => 'Maya',
            'account_name' => 'DJ Business',
            'qr_image_path' => $path,
            'is_enabled' => false,
        ]);

        $this->get(
            '/api/djpaykit/payment-methods/' .
                $paymentMethod->id .
                '/qr',
        )->assertNotFound();
    }

    public function test_it_returns_not_found_for_a_missing_qr_file(): void
    {
        $paymentMethod = PaymentMethod::query()->create([
            'provider' => 'maribank',
            'display_name' => 'MariBank',
            'account_name' => 'DJ Business',
            'qr_image_path' =>
                'djpaykit/qr-codes/maribank/missing.png',
            'is_enabled' => true,
        ]);

        $this->get(
            '/api/djpaykit/payment-methods/' .
                $paymentMethod->id .
                '/qr',
        )->assertNotFound();
    }

    /**
     * Returns a real 1x1 PNG for filesystem response tests.
     */
    private function pngContents(): string
    {
        $contents = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC' .
            'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            true,
        );

        if ($contents === false) {
            throw new RuntimeException(
                'Unable to decode the test PNG.',
            );
        }

        return $contents;
    }
}