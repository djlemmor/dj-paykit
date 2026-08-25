<?php

declare(strict_types=1);

namespace DJLemmor\DJPayKitLaravel\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

final class PaymentMethod extends Model
{
    use HasUlids;
    use SoftDeletes;

    /**
     * Uses the package-prefixed table to avoid conflicts with host apps.
     *
     * @var string
     */
    protected $table = 'djpaykit_payment_methods';

    /**
     * Fields that the package can safely assign through validated input.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'provider',
        'display_name',
        'account_name',
        'account_number',
        'qr_image_path',
        'instructions',
        'show_account_number',
        'is_enabled',
        'sort_order',
    ];

    /**
     * Converts database values into their expected PHP types.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'show_account_number' => 'boolean',
            'is_enabled' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}