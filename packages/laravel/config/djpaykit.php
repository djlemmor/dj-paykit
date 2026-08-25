<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Route prefix
    |--------------------------------------------------------------------------
    |
    | All DJPayKit public and administrator routes will use this prefix.
    |
    */
    'route_prefix' => env('DJPAYKIT_ROUTE_PREFIX', 'api/djpaykit'),

    /*
    |--------------------------------------------------------------------------
    | Route middleware
    |--------------------------------------------------------------------------
    |
    | Public routes use normal API middleware. Administrator routes also
    | require authentication provided by the host Laravel application.
    |
    */
    'api_middleware' => ['api'],

    'admin_middleware' => ['api', 'auth'],

    /*
    |--------------------------------------------------------------------------
    | File storage
    |--------------------------------------------------------------------------
    |
    | QR codes and receipts use private storage by default. They will later
    | be returned through controlled routes instead of public storage paths.
    |
    */
    'storage_disk' => env('DJPAYKIT_STORAGE_DISK', 'local'),

    'qr_image_directory' => 'djpaykit/qr-codes',

    'receipt_image_directory' => 'djpaykit/receipts',

    /*
    |--------------------------------------------------------------------------
    | Image validation
    |--------------------------------------------------------------------------
    |
    | Laravel validates file size in kilobytes. The default is 5 MB.
    |
    */
    'maximum_image_size_kb' => 5120,

    'maximum_image_width' => 4096,

    'maximum_image_height' => 4096,

    /*
    |--------------------------------------------------------------------------
    | Supported payment providers
    |--------------------------------------------------------------------------
    |
    | Provider definitions are centralized so more providers can be added
    | later without changing controller or validation logic.
    |
    */
    'providers' => [
        'gcash' => [
            'display_name' => 'GCash',
        ],

        'maya' => [
            'display_name' => 'Maya',
        ],

        'maribank' => [
            'display_name' => 'MariBank',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment defaults
    |--------------------------------------------------------------------------
    */
    'default_currency' => 'PHP',

    // Account numbers remain hidden unless the owner explicitly enables them.
    'show_account_number_by_default' => false,

    /*
    |--------------------------------------------------------------------------
    | Proof-of-payment feature
    |--------------------------------------------------------------------------
    |
    | This remains disabled while QR upload and display are developed.
    |
    */
    'proof_of_payment_enabled' => env(
        'DJPAYKIT_PROOF_OF_PAYMENT_ENABLED',
        false,
    ),

    /*
    |--------------------------------------------------------------------------
    | Public submission limits
    |--------------------------------------------------------------------------
    |
    | The value will later be applied to Laravel's throttle middleware.
    |
    */
    'submission_rate_limit' => '10,1',

    /*
    |--------------------------------------------------------------------------
    | Data retention
    |--------------------------------------------------------------------------
    |
    | Null means the host application manages its own retention process.
    |
    */
    'retention_days' => null,
];