<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class AdminPaymentMethodManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('djpaykit-test');

        config()->set(
            'djpaykit.storage_disk',
            'djpaykit-test',
        );

        // Host authentication is outside these endpoint behavior tests.
        $this->withoutMiddleware();
    }

    public function test_an_administrator_can_update_payment_details(): void
    {
        $oldPath = 'djpaykit/qr-codes/gcash/original.png';

        Storage::disk('djpaykit-test')->put(
            $oldPath,
            $this->pngContents(),
        );

        $method = PaymentMethod::query()->create([
            'provider' => 'gcash',
            'display_name' => 'GCash',
            'account_name' => 'Old Business',
            'account_number' => '0999 111 2222',
            'qr_image_path' => $oldPath,
            'show_account_number' => false,
            'is_enabled' => true,
        ]);

        $response = $this->patchJson(
            '/api/djpaykit/admin/payment-methods/' .
                $method->id,
            [
                'account_name' => 'DJ Business',
                'show_account_number' => true,
                'sort_order' => 15,
            ],
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'data.accountName',
                'DJ Business',
            )
            ->assertJsonPath(
                'data.showAccountNumber',
                true,
            )
            ->assertJsonPath(
                'data.sortOrder',
                15,
            );

        $method->refresh();

        // An update without a file must preserve the working QR.
        $this->assertSame(
            $oldPath,
            $method->qr_image_path,
        );

        $this->assertTrue(
            Storage::disk('djpaykit-test')->exists(
                $oldPath,
            ),
        );
    }

    public function test_an_administrator_can_replace_the_qr_image(): void
    {
        $oldPath = 'djpaykit/qr-codes/maya/original.png';

        Storage::disk('djpaykit-test')->put(
            $oldPath,
            $this->pngContents(),
        );

        $method = PaymentMethod::query()->create([
            'provider' => 'maya',
            'display_name' => 'Maya',
            'account_name' => 'DJ Business',
            'qr_image_path' => $oldPath,
        ]);

        $image = $this->createPngUpload();

        try {
            $response = $this->patch(
                '/api/djpaykit/admin/payment-methods/' .
                    $method->id,
                [
                    'qr_image' => $image,
                    'instructions' =>
                        'Use your order number as the note.',
                ],
                [
                    'Accept' => 'application/json',
                ],
            );

            $response->assertOk();

            $method->refresh();

            $this->assertNotSame(
                $oldPath,
                $method->qr_image_path,
            );

            // The replacement exists.
            $this->assertTrue(
                Storage::disk('djpaykit-test')->exists(
                    $method->qr_image_path,
                ),
            );

            // The original file was cleaned up.
            $this->assertFalse(
                Storage::disk('djpaykit-test')->exists(
                    $oldPath,
                ),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_a_failed_update_keeps_the_original_qr(): void
    {
        $this->withoutExceptionHandling();

        $oldPath = 'djpaykit/qr-codes/gcash/original.png';

        Storage::disk('djpaykit-test')->put(
            $oldPath,
            $this->pngContents(),
        );

        $method = PaymentMethod::query()->create([
            'provider' => 'gcash',
            'display_name' => 'GCash',
            'account_name' => 'Original Business',
            'qr_image_path' => $oldPath,
        ]);

        PaymentMethod::updating(
            function (): never {
                throw new RuntimeException(
                    'Simulated update failure.',
                );
            },
        );

        $image = $this->createPngUpload();

        try {
            $this->patch(
                '/api/djpaykit/admin/payment-methods/' .
                    $method->id,
                [
                    'account_name' => 'Changed Business',
                    'qr_image' => $image,
                ],
                [
                    'Accept' => 'application/json',
                ],
            );

            $this->fail(
                'The simulated update failure was not thrown.',
            );
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Simulated update failure.',
                $exception->getMessage(),
            );

            $method->refresh();

            $this->assertSame(
                'Original Business',
                $method->account_name,
            );

            $this->assertSame(
                $oldPath,
                $method->qr_image_path,
            );

            /*
             * The newly uploaded replacement was removed, leaving only
             * the original QR.
             */
            $this->assertSame(
                [$oldPath],
                Storage::disk('djpaykit-test')->allFiles(
                    'djpaykit/qr-codes',
                ),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_an_administrator_can_delete_a_payment_method(): void
    {
        $path = 'djpaykit/qr-codes/maribank/delete.png';

        Storage::disk('djpaykit-test')->put(
            $path,
            $this->pngContents(),
        );

        $method = PaymentMethod::query()->create([
            'provider' => 'maribank',
            'display_name' => 'MariBank',
            'account_name' => 'DJ Business',
            'qr_image_path' => $path,
        ]);

        $this->deleteJson(
            '/api/djpaykit/admin/payment-methods/' .
                $method->id,
        )->assertNoContent();

        $this->assertSoftDeleted(
            'djpaykit_payment_methods',
            [
                'id' => $method->id,
            ],
        );

        $this->assertFalse(
            Storage::disk('djpaykit-test')->exists(
                $path,
            ),
        );
    }

    /**
     * Creates a temporary real PNG upload.
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

        file_put_contents(
            $path,
            $this->pngContents(),
        );

        return new UploadedFile(
            $path,
            'replacement.png',
            'image/png',
            null,
            true,
        );
    }

    /**
     * Returns valid PNG contents without requiring GD.
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