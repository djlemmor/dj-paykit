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
use RuntimeException;
use Throwable;

final class PaymentMethodController
{
    /**
     * Creates a payment method and stores its QR image.
     */
    public function store(
        Request $request,
        PaymentMethodValidator $validator,
        QrImageStorage $qrImageStorage,
    ): JsonResponse {
        $input = $request->all();
        $input['qr_image'] = $request->file('qr_image');

        $validated = $validator->validateForCreation($input);
        $qrImage = $validated['qr_image'] ?? null;

        if (! $qrImage instanceof UploadedFile) {
            throw new LogicException(
                'The validated QR image is unavailable.',
            );
        }

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
            // Removes the new file if database creation fails.
            $this->deleteQrQuietly(
                $qrImageStorage,
                $storedPath,
            );

            throw $exception;
        }

        return $this->paymentMethodResponse(
            $paymentMethod,
            JsonResponse::HTTP_CREATED,
        );
    }

    /**
     * Partially updates a payment method and optionally replaces its QR.
     */
    public function update(
        Request $request,
        string $paymentMethod,
        PaymentMethodValidator $validator,
        QrImageStorage $qrImageStorage,
    ): JsonResponse {
        $method = PaymentMethod::query()->findOrFail(
            $paymentMethod,
        );

        $input = $request->all();

        /*
         * Do not add a null qr_image key. The "sometimes" validation rule
         * should only run when a replacement upload was supplied.
         */
        if ($request->hasFile('qr_image')) {
            $input['qr_image'] = $request->file('qr_image');
        }

        $validated = $validator->validateForUpdate($input);
        $oldQrPath = $method->qr_image_path;
        $newQrPath = null;

        $newQrImage = $validated['qr_image'] ?? null;

        if (
            $newQrImage !== null &&
            ! $newQrImage instanceof UploadedFile
        ) {
            throw new LogicException(
                'The validated replacement QR is unavailable.',
            );
        }

        if ($newQrImage instanceof UploadedFile) {
            /*
             * Stores the replacement first. The working QR remains intact
             * until the database update succeeds.
             */
            $newQrPath = $qrImageStorage->store(
                $newQrImage,
                $method->provider,
            );
        }

        // qr_image is not a database column.
        unset($validated['qr_image']);

        if ($newQrPath !== null) {
            $validated['qr_image_path'] = $newQrPath;
        }

        try {
            DB::transaction(
                function () use (
                    $method,
                    $validated,
                ): void {
                    $method->fill($validated);
                    $method->save();
                },
            );
        } catch (Throwable $exception) {
            /*
             * A failed database update removes only the new upload.
             * The old QR path and file remain usable.
             */
            if ($newQrPath !== null) {
                $this->deleteQrQuietly(
                    $qrImageStorage,
                    $newQrPath,
                );
            }

            throw $exception;
        }

        /*
         * The database now points to the replacement, so the old image
         * can be removed safely.
         */
        if (
            $newQrPath !== null &&
            $oldQrPath !== $newQrPath
        ) {
            $this->deleteQrQuietly(
                $qrImageStorage,
                $oldQrPath,
            );
        }

        return $this->paymentMethodResponse(
            $method->refresh(),
        );
    }

    /**
     * Soft-deletes a payment method and removes its stored QR.
     */
    public function destroy(
        string $paymentMethod,
        QrImageStorage $qrImageStorage,
    ): JsonResponse {
        $method = PaymentMethod::query()->findOrFail(
            $paymentMethod,
        );

        $qrPath = $method->qr_image_path;

        DB::transaction(
            function () use ($method): void {
                $deleted = $method->delete();

                if ($deleted !== true) {
                    throw new RuntimeException(
                        'The payment method could not be deleted.',
                    );
                }
            },
        );

        /*
         * Database deletion takes priority. If filesystem cleanup fails,
         * the disabled database record will not expose the old QR publicly.
         */
        $this->deleteQrQuietly(
            $qrImageStorage,
            $qrPath,
        );

        return new JsonResponse(
            null,
            JsonResponse::HTTP_NO_CONTENT,
        );
    }

    /**
     * Creates the administrator JSON representation.
     */
    private function paymentMethodResponse(
        PaymentMethod $paymentMethod,
        int $status = JsonResponse::HTTP_OK,
    ): JsonResponse {
        return new JsonResponse(
            [
                'data' => [
                    'id' => (string) $paymentMethod->id,
                    'provider' => $paymentMethod->provider,
                    'displayName' =>
                        $paymentMethod->display_name,
                    'accountName' =>
                        $paymentMethod->account_name,
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

                    // Private filesystem paths are never returned.
                    'hasQrImage' => true,
                ],
            ],
            $status,
        );
    }

    /**
     * Attempts cleanup without hiding the main database result.
     */
    private function deleteQrQuietly(
        QrImageStorage $qrImageStorage,
        ?string $path,
    ): void {
        try {
            $qrImageStorage->delete($path);
        } catch (Throwable) {
            /*
             * A future cleanup job can remove an orphaned file. This
             * secondary error must not hide the main operation result.
             */
        }
    }
}