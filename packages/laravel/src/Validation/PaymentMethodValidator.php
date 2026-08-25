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

        $validator = $this->validatorFactory->make(
            $input,
            [
                'provider' => [
                    'required',
                    'string',
                    'max:50',
                    new SupportedProvider(),

                    /*
                     * Prevents two active database records from using the
                     * same provider.
                     */
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

                /*
                 * SVG is intentionally excluded because it can contain
                 * executable browser content.
                 */
                'qr_image' => [
                    'required',
                    'file',
                    'image',
                    'mimes:png,jpg,jpeg,webp',
                    "max:{$maximumSize}",
                    "dimensions:max_width={$maximumWidth}," .
                        "max_height={$maximumHeight}",
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

        // Throws ValidationException when administrator input is invalid.
        return $validator->validate();
    }
}