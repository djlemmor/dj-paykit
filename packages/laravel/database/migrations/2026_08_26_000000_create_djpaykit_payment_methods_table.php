<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Creates the table containing the website owner's payment methods.
     */
    public function up(): void
    {
        Schema::create(
            'djpaykit_payment_methods',
            function (Blueprint $table): void {
                /*
                 * ULIDs are difficult to guess and can safely be exposed
                 * as public payment-method identifiers.
                 */
                $table->ulid('id')->primary();

                /*
                 * Each DJPayKit installation has one configured account
                 * for every supported provider.
                 */
                $table->string('provider', 50)->unique();

                $table->string('display_name', 100);
                $table->string('account_name', 150);

                // Optional because some QR codes already contain this data.
                $table->string('account_number', 100)->nullable();

                /*
                 * Stores a private disk path instead of exposing a public
                 * storage URL directly.
                 */
                $table->string('qr_image_path', 2048);

                $table->text('instructions')->nullable();

                /*
                 * The account number stays private unless the owner
                 * explicitly enables it.
                 */
                $table
                    ->boolean('show_account_number')
                    ->default(false);

                // Disabled methods will not appear in the public widget.
                $table->boolean('is_enabled')->default(true);

                // Controls the order displayed in the provider selector.
                $table
                    ->unsignedSmallInteger('sort_order')
                    ->default(0);

                $table->timestamps();
                $table->softDeletes();

                /*
                 * Supports the public query that selects enabled methods
                 * in their configured order.
                 */
                $table->index([
                    'is_enabled',
                    'sort_order',
                ]);
            },
        );
    }

    /**
     * Removes the payment-method table during rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('djpaykit_payment_methods');
    }
};