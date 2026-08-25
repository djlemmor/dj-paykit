<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Services;

use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class QrImageStorage
{
    /**
     * File extensions accepted after MIME-based upload validation.
     *
     * @var array<string, string>
     */
    private const ALLOWED_EXTENSIONS = [
        'png' => 'png',
        'jpg' => 'jpg',
        'jpeg' => 'jpg',
        'webp' => 'webp',
    ];

    public function __construct(
        private readonly FilesystemFactory $filesystem,
    ) {
    }

    /**
     * Stores an uploaded QR image on the configured private disk.
     */
    public function store(
        UploadedFile $image,
        string $provider,
    ): string {
        $this->ensureProviderIsSafeForPath($provider);

        $extension = strtolower(
            (string) $image->extension(),
        );

        $safeExtension =
            self::ALLOWED_EXTENSIONS[$extension] ?? null;

        if ($safeExtension === null) {
            throw new InvalidArgumentException(
                'The QR image format is not supported.',
            );
        }

        /*
         * Generates the filename ourselves so the original uploaded
         * filename can never influence the storage path.
         */
        $filename = Str::lower((string) Str::ulid()) .
            ".{$safeExtension}";

        $directory = $this->qrDirectory() .
            "/{$provider}";

        $storedPath = $this->filesystem
            ->disk($this->diskName())
            ->putFileAs(
                $directory,
                $image,
                $filename,
                ['visibility' => 'private'],
            );

        if (! is_string($storedPath)) {
            throw new RuntimeException(
                'The QR image could not be stored.',
            );
        }

        return $storedPath;
    }

    /**
     * Deletes a QR image belonging to DJPayKit.
     */
    public function delete(?string $path): bool
    {
        if ($path === null || trim($path) === '') {
            return true;
        }

        /*
         * Converts Windows path separators before checking the directory.
         */
        $normalizedPath = ltrim(
            str_replace('\\', '/', $path),
            '/',
        );

        $allowedPrefix = $this->qrDirectory() . '/';

        if (! str_starts_with($normalizedPath, $allowedPrefix)) {
            throw new InvalidArgumentException(
                'DJPayKit cannot delete a file outside its QR directory.',
            );
        }

        return $this->filesystem
            ->disk($this->diskName())
            ->delete($normalizedPath);
    }

    /**
     * Prevents provider IDs from adding path traversal characters.
     */
    private function ensureProviderIsSafeForPath(
        string $provider,
    ): void {
        $isSafe = preg_match(
            '/\A[a-z0-9]+(?:[-_][a-z0-9]+)*\z/',
            $provider,
        ) === 1;

        if (! $isSafe) {
            throw new InvalidArgumentException(
                'The provider cannot be used in a storage path.',
            );
        }
    }

    /**
     * Returns the configured filesystem disk.
     */
    private function diskName(): string
    {
        $disk = config('djpaykit.storage_disk', 'local');

        if (! is_string($disk) || trim($disk) === '') {
            throw new RuntimeException(
                'The DJPayKit storage disk is invalid.',
            );
        }

        return $disk;
    }

    /**
     * Returns a normalized QR directory without outside path segments.
     */
    private function qrDirectory(): string
    {
        $directory = config(
            'djpaykit.qr_image_directory',
            'djpaykit/qr-codes',
        );

        if (! is_string($directory)) {
            throw new RuntimeException(
                'The DJPayKit QR directory is invalid.',
            );
        }

        $directory = trim(
            str_replace('\\', '/', $directory),
            '/',
        );

        if (
            $directory === '' ||
            str_contains($directory, '..')
        ) {
            throw new RuntimeException(
                'The DJPayKit QR directory is invalid.',
            );
        }

        return $directory;
    }
}