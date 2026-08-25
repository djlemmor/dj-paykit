<?php

declare(strict_types=1);

use DJLemmor\DJPayKitLaravel\Http\Controllers\Admin\PaymentMethodController;
use Illuminate\Support\Facades\Route;

/*
 * Host applications can change both the prefix and authentication
 * middleware through config/djpaykit.php.
 */
Route::prefix(
    (string) config(
        'djpaykit.route_prefix',
        'api/djpaykit',
    ),
)
    ->middleware(
        (array) config(
            'djpaykit.admin_middleware',
            ['api', 'auth'],
        ),
    )
    ->group(function (): void {
        Route::post(
            'admin/payment-methods',
            [PaymentMethodController::class, 'store'],
        )->name('djpaykit.admin.payment-methods.store');
    });