<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Tests\Feature;

use DJLemmor\DJPayKitLaravel\Services\QrImageStorage;
use DJLemmor\DJPayKitLaravel\Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;

final class QrImageStorageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Uses an isolated temporary disk instead of real application files.
        Storage::fake('djpaykit-test');

        config()->set(
            'djpaykit.storage_disk',
            'djpaykit-test',
        );
    }

    public function test_it_stores_and_deletes_a_private_qr_image(): void
    {
        $image = $this->createPngUpload();

        try {
            $storage = $this->app->make(
                QrImageStorage::class,
            );

            $path = $storage->store(
                $image,
                'gcash',
            );

            // The uploaded filename must not appear in the stored path.
            $this->assertStringStartsWith(
                'djpaykit/qr-codes/gcash/',
                $path,
            );

            $this->assertStringEndsWith(
                '.png',
                $path,
            );

            /*
            * Uses the filesystem contract's standard exists() method, which is
            * recognized by both PHPUnit and the editor.
            */
            $this->assertTrue(
                Storage::disk('djpaykit-test')->exists($path),
            );

            $this->assertTrue(
                $storage->delete($path),
            );

            // Confirms the file was removed from the fake storage disk.
            $this->assertFalse(
                Storage::disk('djpaykit-test')->exists($path),
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_rejects_an_unsafe_provider_path(): void
    {
        $image = $this->createPngUpload();

        try {
            $storage = $this->app->make(
                QrImageStorage::class,
            );

            $this->expectException(
                InvalidArgumentException::class,
            );

            // Attempts to escape the configured provider directory.
            $storage->store(
                $image,
                '../private',
            );
        } finally {
            @unlink($image->getPathname());
        }
    }

    public function test_it_refuses_to_delete_an_unrelated_file(): void
    {
        $storage = $this->app->make(
            QrImageStorage::class,
        );

        $this->expectException(
            InvalidArgumentException::class,
        );

        // Only files below djpaykit/qr-codes may be removed.
        $storage->delete('documents/important.txt');
    }

    /**
     * Creates a valid PNG fixture without needing the GD extension.
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