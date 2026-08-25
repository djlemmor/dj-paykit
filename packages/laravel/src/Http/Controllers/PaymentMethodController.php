<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Http\Controllers;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Filesystem\FilesystemAdapter;

final class PaymentMethodController
{
    /**
     * Maps supported image MIME types to safe download extensions.
     *
     * @var array<string, string>
     */
    private const MIME_EXTENSIONS = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    /**
     * Returns enabled payment methods for the public widget.
     */
    public function index(
        UrlGenerator $urlGenerator,
    ): JsonResponse {
        $paymentMethods = PaymentMethod::query()
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->orderBy('provider')
            ->get();

        $data = $paymentMethods
            ->map(
                function (
                    PaymentMethod $paymentMethod,
                ) use ($urlGenerator): array {
                    return [
                        'id' => (string) $paymentMethod->id,
                        'provider' => $paymentMethod->provider,
                        'displayName' =>
                            $paymentMethod->display_name,
                        'accountName' =>
                            $paymentMethod->account_name,

                        /*
                         * The public API returns null unless the owner
                         * explicitly enabled account-number display.
                         */
                        'accountNumber' =>
                            $paymentMethod->show_account_number
                                ? $paymentMethod->account_number
                                : null,

                        'qrImageUrl' => $urlGenerator->route(
                            'djpaykit.payment-methods.qr',
                            [
                                'paymentMethod' =>
                                    $paymentMethod->id,
                            ],
                        ),

                        'instructions' =>
                            $paymentMethod->instructions,
                    ];
                },
            )
            ->values()
            ->all();

        return new JsonResponse([
            'data' => $data,
        ]);
    }

    /**
     * Returns an enabled payment method's QR from private storage.
     */
    public function qr(
        string $paymentMethod,
        FilesystemFactory $filesystem,
    ): Response {
        /*
         * Disabled and soft-deleted payment methods must appear missing
         * to public visitors.
         */
        $method = PaymentMethod::query()
            ->whereKey($paymentMethod)
            ->where('is_enabled', true)
            ->firstOrFail();

        $diskName = config(
            'djpaykit.storage_disk',
            'local',
        );

        if (! is_string($diskName) || trim($diskName) === '') {
            throw new RuntimeException(
                'The DJPayKit storage disk is invalid.',
            );
        }

        $disk = $filesystem->disk($diskName);

        /*
        * Laravel's standard local, S3, and fake disks use FilesystemAdapter.
        * This check also lets the editor recognize methods such as mimeType().
        */
        if (! $disk instanceof FilesystemAdapter) {
            throw new RuntimeException(
                'The configured DJPayKit disk does not support file metadata.',
            );
        }

        $path = $method->qr_image_path;

        if (
            ! is_string($path) ||
            trim($path) === '' ||
            ! $disk->exists($path)
        ) {
            throw new NotFoundHttpException(
                'The QR image could not be found.',
            );
        }

        $mimeType = $disk->mimeType($path);

        $extension = is_string($mimeType)
            ? self::MIME_EXTENSIONS[$mimeType] ?? null
            : null;

        /*
         * Refuses to serve unexpected file formats even if the stored
         * database path was modified outside DJPayKit.
         */
        if ($extension === null) {
            throw new NotFoundHttpException(
                'The QR image format is unsupported.',
            );
        }

        $content = $disk->get($path);

        $safeProvider = preg_replace(
            '/[^a-z0-9_-]+/i',
            '-',
            $method->provider,
        );

        if (
            ! is_string($safeProvider) ||
            trim($safeProvider, '-') === ''
        ) {
            $safeProvider = 'payment';
        }

        /*
         * The image is returned inline without revealing its actual
         * filesystem or cloud-storage location.
         */
        return new Response(
            $content,
            Response::HTTP_OK,
            [
                'Content-Type' => $mimeType,
                'Content-Disposition' =>
                    'inline; filename="djpaykit-' .
                    $safeProvider .
                    "-qr.{$extension}\"",

                // Prevents browsers from interpreting the file as HTML.
                'X-Content-Type-Options' => 'nosniff',

                /*
                 * Allows short browser caching without permitting shared
                 * proxy caches to retain a merchant QR image.
                 */
                'Cache-Control' => 'private, max-age=300',
            ],
        );
    }
}