# DJPayKit

DJPayKit is a reusable QR-payment toolkit for Philippine e-wallets. It combines a framework-independent web component with a Laravel 12 backend adapter.

The customer selects a payment provider, views its account details and QR code, and can copy the account number or download the QR image without reloading the page.

## Packages

| Package                                                                                 | Description                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`@djlemmor/djpaykit`](https://www.npmjs.com/package/@djlemmor/djpaykit)                | Framework-independent frontend payment widget |
| [`djlemmor/djpaykit-laravel`](https://packagist.org/packages/djlemmor/djpaykit-laravel) | Laravel 12 backend adapter                    |

## Supported providers

- GCash
- Maya
- MariBank

Additional providers can be added through the Laravel package configuration.

## Quick start

Install the Laravel adapter:

```bash
# Installs the DJPayKit backend.
composer require djlemmor/djpaykit-laravel:^0.1

# Publishes configuration and migrations.
php artisan djpaykit:install

# Creates the payment-method database table.
php artisan migrate
```

Install the frontend widget:

```bash
# Installs the framework-independent web component.
npm install @djlemmor/djpaykit
```

Register and display the widget:

```typescript
import { defineDJPayKitWidget } from "@djlemmor/djpaykit";

// Registers <djpaykit-widget> with the browser.
defineDJPayKitWidget();
```

```html
<djpaykit-widget
  api-url="/api/djpaykit/payment-methods"
  order-reference="ORDER-1001"
  amount="500.00"
  currency="PHP"
></djpaykit-widget>
```

## Features

- Selectable payment providers
- Account-name and optional account-number display
- Copy-account-number action with browser fallback support
- QR-image display and download
- Accessible loading, error, retry, and action feedback
- Private Laravel QR-image storage
- Configurable administrator and public routes
- Safe QR replacement and deletion
- Automatic Laravel package discovery
- Automated TypeScript and PHP tests

## Payment verification

DJPayKit displays payment instructions and QR codes, but it does not automatically verify payment completion. Payments should remain pending until they are reviewed by the website owner or another verification system.

## Development checks

Frontend package:

```bash
# Runs code-quality and production checks.
npm run format:check --workspace=@djlemmor/djpaykit
npm run lint --workspace=@djlemmor/djpaykit
npm run test --workspace=@djlemmor/djpaykit
npm run build --workspace=@djlemmor/djpaykit
```

Laravel package:

```bash
cd packages/laravel

# Validates package metadata and behavior.
composer validate --strict
composer test
```

## Repositories

- Main project: [djlemmor/dj-paykit](https://github.com/djlemmor/dj-paykit)
- Laravel distribution: [djlemmor/dj-paykit-laravel](https://github.com/djlemmor/dj-paykit-laravel)

## License

DJPayKit is open-source software licensed under the [MIT License](LICENSE).
