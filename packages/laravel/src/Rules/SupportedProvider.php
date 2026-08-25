<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class SupportedProvider implements ValidationRule
{
    /**
     * Confirms that the provider exists in DJPayKit configuration.
     *
     * @param Closure(string, string|null=): void $fail
     */
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail,
    ): void {
        $providers = config('djpaykit.providers', []);

        /*
         * Reading from configuration lets host applications add providers
         * without changing this validation class.
         */
        if (
            ! is_string($value) ||
            ! is_array($providers) ||
            ! array_key_exists($value, $providers)
        ) {
            $fail(
                'The selected :attribute is not supported by DJPayKit.',
            );
        }
    }
}