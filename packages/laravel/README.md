# DJPayKit Laravel

Laravel 12 backend adapter for the DJPayKit QR payment widget.

It allows a website owner to configure payment methods such as GCash,
Maya, and MariBank, upload private QR images, and expose controlled
public endpoints for the DJPayKit widget.

## Requirements

- PHP 8.2 or newer
- Laravel 12
- A Laravel filesystem disk
- Authentication middleware for administrator endpoints

## Features

- GCash, Maya, and MariBank support
- Extensible provider configuration
- Private QR image storage
- Public payment-method API
- Controlled QR image responses
- Administrator CRUD endpoints
- Account-number privacy controls
- ULID payment-method identifiers
- Soft deletion
- Validated PNG, JPEG, and WebP uploads
- Safe QR replacement and cleanup
- Automated package tests

## Installation

The package has not yet been published to Packagist. The standard
installation command will become available after the first release:

```bash
composer require djlemmor/djpaykit-laravel
```

Then run:

```bash
# Publishes the configuration and database migration.
php artisan djpaykit:install

# Creates the DJPayKit database table.
php artisan migrate
```

## Local development installation

Add DJPayKit as a Composer path repository:

```bash
# Registers the local Laravel adapter.
composer config repositories.djpaykit path ../DJPayKit/packages/laravel

# Installs the development version.
composer require djlemmor/djpaykit-laravel:@dev
```

Run the installer:

```bash
php artisan djpaykit:install
php artisan migrate
```

Composer normally symlinks the package, so local DJPayKit changes become
available without reinstalling it.

## Configuration

The installation command publishes:

```text
config/djpaykit.php
```

Important settings:

| Setting                          |           Default | Purpose                                  |
| -------------------------------- | ----------------: | ---------------------------------------- |
| `route_prefix`                   |    `api/djpaykit` | Prefix for all package routes            |
| `api_middleware`                 |         `['api']` | Middleware for public widget routes      |
| `admin_middleware`               | `['api', 'auth']` | Middleware for administrator routes      |
| `storage_disk`                   |           `local` | Private QR and receipt storage           |
| `maximum_image_size_kb`          |            `5120` | Maximum upload size in kilobytes         |
| `maximum_image_width`            |            `4096` | Maximum QR width                         |
| `maximum_image_height`           |            `4096` | Maximum QR height                        |
| `default_currency`               |             `PHP` | Default payment currency                 |
| `show_account_number_by_default` |           `false` | Default public account-number visibility |
| `proof_of_payment_enabled`       |           `false` | Enables future receipt submissions       |

Environment variables:

```dotenv
DJPAYKIT_ROUTE_PREFIX=api/djpaykit
DJPAYKIT_STORAGE_DISK=local
DJPAYKIT_PROOF_OF_PAYMENT_ENABLED=false
```

## Administrator authentication

Administrator endpoints use the middleware configured in:

```php
'admin_middleware' => ['api', 'auth'],
```

Applications using Sanctum can change it to:

```php
/*
 * Requires an authenticated Sanctum user for administrator actions.
 */
'admin_middleware' => ['api', 'auth:sanctum'],
```

DJPayKit does not create administrator users or decide which users are
authorized. The host Laravel application remains responsible for
authentication and authorization.

## Storage security

QR images use Laravel's configured private disk:

```php
'storage_disk' => 'local',
```

Laravel 12's local disk normally stores private files below:

```text
storage/app/private
```

DJPayKit serves QR images through a controlled route. It never returns
the underlying filesystem or cloud-storage path.

Do not move DJPayKit QR images to the public disk unless your
application intentionally wants to bypass these controls.

## Supported providers

The default providers are:

```php
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
```

A host application can add another provider:

```php
/*
 * Adds another provider without changing the package source.
 */
'providers' => [
    // Existing providers...

    'instapay' => [
        'display_name' => 'InstaPay',
    ],
],
```

Provider IDs may contain lowercase letters, numbers, hyphens, and
underscores.

## Public API

### List enabled payment methods

```http
GET /api/djpaykit/payment-methods
```

Example response:

```json
{
  "data": [
    {
      "id": "01m0wvqzdj7czkf04tjc8443k6",
      "provider": "gcash",
      "displayName": "GCash",
      "accountName": "DJ Business",
      "accountNumber": null,
      "qrImageUrl": "https://example.com/api/djpaykit/payment-methods/01m0wvqzdj7czkf04tjc8443k6/qr",
      "instructions": "Include your order number."
    }
  ]
}
```

`accountNumber` is `null` unless the owner enables
`show_account_number` for that payment method.

Disabled and soft-deleted methods are excluded.

### Display a QR image

```http
GET /api/djpaykit/payment-methods/{paymentMethod}/qr
```

The endpoint:

- Only serves enabled payment methods
- Reads from the configured private disk
- Allows PNG, JPEG, and WebP
- Sends `X-Content-Type-Options: nosniff`
- Does not expose the private storage path
- Returns `404` for disabled, deleted, missing, or unsupported images

## Administrator API

All administrator routes require the configured administrator
middleware.

### List payment methods

```http
GET /api/djpaykit/admin/payment-methods
```

The administrator list includes enabled and disabled methods but
excludes soft-deleted records and private QR paths.

### Create a payment method

```http
POST /api/djpaykit/admin/payment-methods
Content-Type: multipart/form-data
```

Example using cURL:

```bash
# Replace TOKEN and the image path with actual values.
curl -X POST "https://example.com/api/djpaykit/admin/payment-methods" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -F "provider=gcash" \
  -F "display_name=GCash" \
  -F "account_name=DJ Business" \
  -F "account_number=0912 345 6789" \
  -F "show_account_number=1" \
  -F "is_enabled=1" \
  -F "sort_order=10" \
  -F "instructions=Include your order number." \
  -F "qr_image=@/absolute/path/gcash.png"
```

Required fields:

- `provider`
- `display_name`
- `account_name`
- `qr_image`

Optional fields:

- `account_number`
- `instructions`
- `show_account_number`
- `is_enabled`
- `sort_order`

QR requirements:

- PNG, JPEG, or WebP
- Maximum 5 MB by default
- Maximum 4096×4096 pixels by default
- SVG is not accepted

### Update a payment method

```http
PATCH /api/djpaykit/admin/payment-methods/{paymentMethod}
```

All update fields are optional. The provider cannot be changed after
creation.

Example replacing a QR:

```bash
# Stores the replacement before removing the currently working QR.
curl -X PATCH \
  "https://example.com/api/djpaykit/admin/payment-methods/PAYMENT_METHOD_ID" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -F "account_name=Updated Business" \
  -F "qr_image=@/absolute/path/new-gcash.png"
```

If the database update fails, DJPayKit deletes the new upload and keeps
the original QR.

### Delete a payment method

```http
DELETE /api/djpaykit/admin/payment-methods/{paymentMethod}
```

Deletion:

- Soft-deletes the database record
- Removes the associated QR image
- Prevents the public API from returning the method
- Returns HTTP `204 No Content`

## Error responses

Common status codes:

| Status | Meaning                                |
| -----: | -------------------------------------- |
|  `200` | Successful list or update              |
|  `201` | Payment method created                 |
|  `204` | Payment method deleted                 |
|  `404` | Payment method or QR not found         |
|  `422` | Validation failed                      |
|  `500` | Unexpected storage or database failure |

Laravel returns validation errors in its normal JSON format:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "provider": ["The selected provider is not supported by DJPayKit."]
  }
}
```

## Routes

List all package routes:

```bash
php artisan route:list --name=djpaykit
```

DJPayKit registers:

```text
GET     api/djpaykit/admin/payment-methods
POST    api/djpaykit/admin/payment-methods
PATCH   api/djpaykit/admin/payment-methods/{paymentMethod}
DELETE  api/djpaykit/admin/payment-methods/{paymentMethod}
GET     api/djpaykit/payment-methods
GET     api/djpaykit/payment-methods/{paymentMethod}/qr
```

## Frontend widget integration

Install the core widget after it is published:

```bash
npm install @djlemmor/djpaykit
```

For local development:

```bash
# Installs the core package directly from the DJPayKit repository.
npm install ../DJPayKit/packages/core
```

Register the custom element in the application's JavaScript entry:

```javascript
import { defineDJPayKitWidget } from "@djlemmor/djpaykit";

/*
 * Registers <djpaykit-widget> with the browser.
 */
defineDJPayKitWidget();
```

Example Laravel Blade integration:

```blade
{{-- Vite loads the JavaScript that registers the widget. --}}
@vite('resources/js/app.js')

<djpaykit-widget
    api-url="{{ url('/api/djpaykit/payment-methods') }}"
    order-reference="ORDER-1001"
    amount="500.00"
    currency="PHP"
></djpaykit-widget>
```

The first enabled method is selected automatically. Selecting another
provider updates its account details and QR without reloading the page.

### Widget events

The host checkout can observe provider selection:

```javascript
document.addEventListener("djpaykit:provider-selected", (event) => {
  /*
   * detail contains paymentMethodId and provider.
   * It does not expose the account number.
   */
  console.log(event.detail);
});
```

The host checkout can also observe successful QR downloads:

```javascript
document.addEventListener("djpaykit:qr-downloaded", (event) => {
  /*
   * detail contains paymentMethodId and provider.
   */
  console.log(event.detail);
});
```

For the simplest integration, serve the Laravel API and widget from the
same origin. Cross-origin integrations require the host application's
CORS configuration to allow the checkout website.

## Package development

Install dependencies:

```bash
composer install
```

Run tests:

```bash
composer test
```

Run a specific test:

```bash
vendor/bin/phpunit tests/Feature/PublicPaymentMethodEndpointTest.php
```

On Windows, if Git Bash cannot run the Unix vendor launcher, use:

```bash
composer exec -- phpunit tests/Feature/PublicPaymentMethodEndpointTest.php
```

Current verified result:

```text
Tests: 28
Assertions: 96
```

## License

DJPayKit Laravel is open-source software licensed under the MIT License.
