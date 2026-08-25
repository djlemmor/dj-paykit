<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Http\Controllers\Admin;

use DJLemmor\DJPayKitLaravel\Models\PaymentMethod;
use DJLemmor\DJPayKitLaravel\Services\QrImageStorage;
use DJLemmor\DJPayKitLaravel\Validation\PaymentMethodValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use LogicException;
use Throwable;

final class PaymentMethodController
{
    /**
     * Creates an administrator-managed payment method.
     */
    public function store(
        Request $request,
        PaymentMethodValidator $validator,
        QrImageStorage $qrImageStorage,
    ): JsonResponse {
        /*
         * Explicitly adds the uploaded file to the validation input so this
         * works consistently for multipart HTTP requests.
         */
        $input = $request->all();
        $input['qr_image'] = $request->file('qr_image');

        $validated = $validator->validateForCreation($input);

        $qrImage = $validated['qr_image'] ?? null;

        if (! $qrImage instanceof UploadedFile) {
            throw new LogicException(
                'The validated QR image is unavailable.',
            );
        }

        /*
         * The image is stored before the database record because the model
         * must contain its final private storage path.
         */
        $storedPath = $qrImageStorage->store(
            $qrImage,
            (string) $validated['provider'],
        );

        try {
            $paymentMethod = DB::transaction(
                function () use (
                    $validated,
                    $storedPath,
                ): PaymentMethod {
                    return PaymentMethod::query()->create([
                        'provider' =>
                            $validated['provider'],

                        'display_name' =>
                            $validated['display_name'],

                        'account_name' =>
                            $validated['account_name'],

                        'account_number' =>
                            $validated['account_number'] ?? null,

                        'qr_image_path' => $storedPath,

                        'instructions' =>
                            $validated['instructions'] ?? null,

                        'show_account_number' =>
                            $validated['show_account_number'] ??
                            config(
                                'djpaykit.show_account_number_by_default',
                                false,
                            ),

                        'is_enabled' =>
                            $validated['is_enabled'] ?? true,

                        'sort_order' =>
                            $validated['sort_order'] ?? 0,
                    ]);
                },
            );
        } catch (Throwable $exception) {
            /*
             * Prevents an orphaned QR image when the database transaction
             * cannot create the payment method.
             */
            try {
                $qrImageStorage->delete($storedPath);
            } catch (Throwable) {
                /*
                 * The original database exception is more important and
                 * must not be hidden by a secondary cleanup failure.
                 */
            }

            throw $exception;
        }

        return new JsonResponse(
            [
                'data' => [
                    'id' => (string) $paymentMethod->id,
                    'provider' => $paymentMethod->provider,
                    'displayName' => $paymentMethod->display_name,
                    'accountName' => $paymentMethod->account_name,

                    /*
                     * This is an authenticated administrator response, so
                     * it may include the configured account number.
                     */
                    'accountNumber' =>
                        $paymentMethod->account_number,

                    'instructions' =>
                        $paymentMethod->instructions,

                    'showAccountNumber' =>
                        $paymentMethod->show_account_number,

                    'isEnabled' =>
                        $paymentMethod->is_enabled,

                    'sortOrder' =>
                        $paymentMethod->sort_order,

                    // Internal filesystem paths are never returned.
                    'hasQrImage' => true,
                ],
            ],
            JsonResponse::HTTP_CREATED,
        );
    }
}