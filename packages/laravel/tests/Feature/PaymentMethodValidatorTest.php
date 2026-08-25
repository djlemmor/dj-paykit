<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use DJLemmor\DJPayKitLaravel\Validation\PaymentMethodValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class PaymentMethodValidatorTest extends TestCase
{
    public function test_it_accepts_valid_payment_method_input(): void
    {
        $image = $this->createPngUpload();

        try {
            $validator = $this->app->make(
                PaymentMethodValidator::class,
            );

            $validated = $validator->validateForCreation([
                'provider' => 'gcash',
                'display_name' => 'GCash',
                'account_name' => 'DJ Business',
                'account_number' => '0912 345 6789',
                'qr_image' => $image,
                'instructions' => 'Include your order number.',
                'show_account_number' => true,
                'is_enabled' => true,
                'sort_order' => 10,
            ]);

            $this->assertSame(
                'gcash',
                $validated['provider'],
            );

            $this->assertSame(
                $image,
                $validated['qr_image'],
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_rejects_an_unsupported_provider(): void
    {
        $image = $this->createPngUpload();

        try {
            $validator = $this->app->make(
                PaymentMethodValidator::class,
            );

            $validator->validateForCreation([
                'provider' => 'unknown-wallet',
                'display_name' => 'Unknown',
                'account_name' => 'DJ Business',
                'qr_image' => $image,
            ]);

            $this->fail(
                'Unsupported provider validation should have failed.',
            );
        } catch (ValidationException $exception) {
            // Confirms that the error belongs to the provider field.
            $this->assertArrayHasKey(
                'provider',
                $exception->errors(),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_rejects_a_duplicate_provider(): void
    {
        PaymentMethod::query()->create([
            'provider' => 'maya',
            'display_name' => 'Maya',
            'account_name' => 'Existing Business',
            'qr_image_path' => 'djpaykit/qr-codes/maya/existing.png',
        ]);

        $image = $this->createPngUpload();

        try {
            $validator = $this->app->make(
                PaymentMethodValidator::class,
            );

            $validator->validateForCreation([
                'provider' => 'maya',
                'display_name' => 'Maya',
                'account_name' => 'New Business',
                'qr_image' => $image,
            ]);

            $this->fail(
                'Duplicate provider validation should have failed.',
            );
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey(
                'provider',
                $exception->errors(),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    /**
     * Creates a real 1x1 PNG without requiring the PHP GD extension.
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