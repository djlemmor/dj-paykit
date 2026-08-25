<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class AdminPaymentMethodEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        /*
         * Uses isolated fake storage so tests never write to the
         * developer's real storage directory.
         */
        Storage::fake('djpaykit-test');

        config()->set(
            'djpaykit.storage_disk',
            'djpaykit-test',
        );

        /*
         * Authentication behavior belongs to the host application.
         * These tests focus on the package endpoint itself.
         */
        $this->withoutMiddleware();
    }

    public function test_an_administrator_can_create_a_payment_method(): void
    {
        $image = $this->createPngUpload();

        try {
            $response = $this->post(
                '/api/djpaykit/admin/payment-methods',
                [
                    'provider' => 'gcash',
                    'display_name' => 'GCash',
                    'account_name' => 'DJ Business',
                    'account_number' => '0912 345 6789',
                    'qr_image' => $image,
                    'instructions' =>
                        'Include your order number.',
                    'show_account_number' => true,
                    'is_enabled' => true,
                    'sort_order' => 10,
                ],
                [
                    'Accept' => 'application/json',
                ],
            );

            $response
                ->assertCreated()
                ->assertJsonPath(
                    'data.provider',
                    'gcash',
                )
                ->assertJsonPath(
                    'data.displayName',
                    'GCash',
                )
                ->assertJsonPath(
                    'data.showAccountNumber',
                    true,
                )
                ->assertJsonPath(
                    'data.hasQrImage',
                    true,
                );

            $paymentMethod =
                PaymentMethod::query()->firstOrFail();

            $this->assertSame(
                'DJ Business',
                $paymentMethod->account_name,
            );

            /*
             * The model contains a private path, but the HTTP response
             * must not expose it.
             */
            $this->assertTrue(
                Storage::disk('djpaykit-test')->exists(
                    $paymentMethod->qr_image_path,
                ),
            );

            $response->assertJsonMissingPath(
                'data.qrImagePath',
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_rejects_invalid_administrator_input(): void
    {
        $image = $this->createPngUpload();

        try {
            $response = $this->post(
                '/api/djpaykit/admin/payment-methods',
                [
                    'provider' => 'unknown-wallet',
                    'display_name' => 'Unknown',
                    'account_name' => 'DJ Business',
                    'qr_image' => $image,
                ],
                [
                    'Accept' => 'application/json',
                ],
            );

            $response
                ->assertUnprocessable()
                ->assertJsonValidationErrors([
                    'provider',
                ]);

            $this->assertDatabaseCount(
                'djpaykit_payment_methods',
                0,
            );

            /*
             * Validation occurs before storage, so invalid requests
             * cannot leave files behind.
             */
            $this->assertSame(
                [],
                Storage::disk('djpaykit-test')->allFiles(
                    'djpaykit/qr-codes',
                ),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_removes_the_qr_when_database_creation_fails(): void
    {
        /*
         * Allows the simulated exception to reach the test instead of
         * being converted into a generic HTTP 500 response.
         */
        $this->withoutExceptionHandling();

        PaymentMethod::creating(
            function (): never {
                throw new RuntimeException(
                    'Simulated database failure.',
                );
            },
        );

        $image = $this->createPngUpload();

        try {
            $this->post(
                '/api/djpaykit/admin/payment-methods',
                [
                    'provider' => 'maya',
                    'display_name' => 'Maya',
                    'account_name' => 'DJ Business',
                    'qr_image' => $image,
                ],
                [
                    'Accept' => 'application/json',
                ],
            );

            $this->fail(
                'The simulated database failure was not thrown.',
            );
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Simulated database failure.',
                $exception->getMessage(),
            );

            /*
             * The controller must delete the image that was stored before
             * the database operation failed.
             */
            $this->assertSame(
                [],
                Storage::disk('djpaykit-test')->allFiles(
                    'djpaykit/qr-codes',
                ),
            );

            $this->assertDatabaseCount(
                'djpaykit_payment_methods',
                0,
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    /**
     * Creates a real PNG upload without requiring the GD extension.
     */
    private function createPngUpload(): UploadedFile
    {
        $path = tempnam(
            sys_get_temp_dir(),
            'djpaykit-test-',
        );

        if ($path === false) {
            throw new RuntimeException(
                'Unable to create a temporary test image.',
            );
        }

        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC' .
            'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            true,
        );

        if ($png === false) {
            throw new RuntimeException(
                'Unable to decode the test image.',
            );
        }

        file_put_contents($path, $png);

        return new UploadedFile(
            $path,
            'qr.png',
            'image/png',
            null,
            true,
        );
    }
}