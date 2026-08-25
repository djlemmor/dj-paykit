<?php

declare(strict_types=1);

use DJLemmor\DJPayKitLaravel\Http\Controllers\Admin\PaymentMethodController as AdminPaymentMethodController;
use DJLemmor\DJPayKitLaravel\Http\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

$prefix = (string) config(
    'djpaykit.route_prefix',
    'api/djpaykit',
);

$apiMiddleware = (array) config(
    'djpaykit.api_middleware',
    ['api'],
);

$adminMiddleware = (array) config(
    'djpaykit.admin_middleware',
    ['api', 'auth'],
);

Route::prefix($prefix)->group(
    function () use (
        $apiMiddleware,
        $adminMiddleware,
    ): void {
        /*
         * Public widget routes do not require authentication, but still
         * receive the host application's API middleware.
         */
        Route::middleware($apiMiddleware)->group(
            function (): void {
                Route::get(
                    'payment-methods',
                    [PaymentMethodController::class, 'index'],
                )->name('djpaykit.payment-methods.index');

                Route::get(
                    'payment-methods/{paymentMethod}/qr',
                    [PaymentMethodController::class, 'qr'],
                )->name('djpaykit.payment-methods.qr');
            },
        );

        /*
         * Administrator routes remain protected by the middleware
         * configured by the host application.
         */
        Route::middleware($adminMiddleware)->group(
            function (): void {
                Route::post(
                    'admin/payment-methods',
                    [
                        AdminPaymentMethodController::class,
                        'store',
                    ],
                )->name(
                    'djpaykit.admin.payment-methods.store',
                );
            },
        );
    },
);