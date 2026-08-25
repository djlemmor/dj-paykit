<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Validation;

use DJLemmor\DJPayKitLaravel\Rules\SupportedProvider;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Illuminate\Validation\Rule;

final class PaymentMethodValidator
{
    public function __construct(
        private readonly ValidationFactory $validatorFactory,
    ) {
    }

    /**
     * Validates administrator input for a new payment method.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function validateForCreation(array $input): array
    {
        $validator = $this->validatorFactory->make(
            $input,
            [
                'provider' => [
                    'required',
                    'string',
                    'max:50',
                    new SupportedProvider(),
                    Rule::unique(
                        'djpaykit_payment_methods',
                        'provider',
                    ),
                ],

                'display_name' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'account_name' => [
                    'required',
                    'string',
                    'max:150',
                ],

                'account_number' => [
                    'nullable',
                    'string',
                    'max:100',
                ],

                'qr_image' => [
                    'required',
                    ...$this->qrImageRules(),
                ],

                'instructions' => [
                    'nullable',
                    'string',
                    'max:2000',
                ],

                'show_account_number' => [
                    'sometimes',
                    'boolean',
                ],

                'is_enabled' => [
                    'sometimes',
                    'boolean',
                ],

                'sort_order' => [
                    'sometimes',
                    'integer',
                    'min:0',
                    'max:65535',
                ],
            ],
        );

        return $validator->validate();
    }

    /**
     * Validates partial administrator updates.
     *
     * The provider cannot be changed after creation because it determines
     * the payment method's identity and QR storage directory.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function validateForUpdate(array $input): array
    {
        $validator = $this->validatorFactory->make(
            $input,
            [
                'display_name' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:100',
                ],

                'account_name' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:150',
                ],

                'account_number' => [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:100',
                ],

                /*
                 * A new QR is optional. If supplied, it receives the same
                 * validation as the original image.
                 */
                'qr_image' => [
                    'sometimes',
                    ...$this->qrImageRules(),
                ],

                'instructions' => [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:2000',
                ],

                'show_account_number' => [
                    'sometimes',
                    'boolean',
                ],

                'is_enabled' => [
                    'sometimes',
                    'boolean',
                ],

                'sort_order' => [
                    'sometimes',
                    'integer',
                    'min:0',
                    'max:65535',
                ],
            ],
        );

        return $validator->validate();
    }

    /**
     * Returns the shared QR upload restrictions.
     *
     * @return array<int, string>
     */
    private function qrImageRules(): array
    {
        $maximumSize = (int) config(
            'djpaykit.maximum_image_size_kb',
            5120,
        );

        $maximumWidth = (int) config(
            'djpaykit.maximum_image_width',
            4096,
        );

        $maximumHeight = (int) config(
            'djpaykit.maximum_image_height',
            4096,
        );

        return [
            'file',
            'image',

            // SVG is excluded because it may contain executable content.
            'mimes:png,jpg,jpeg,webp',

            "max:{$maximumSize}",

            "dimensions:max_width={$maximumWidth}," .
                "max_height={$maximumHeight}",
        ];
    }
}