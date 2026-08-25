# @djlemmor/djpaykit

A framework-independent QR-payment web component for Philippine e-wallets.

DJPayKit lets customers select an enabled payment provider, view its account details and QR code, copy an account number, and download a QR image without reloading the page.

## Installation

```bash
# Installs the frontend widget.
npm install @djlemmor/djpaykit
```

## Register the component

```typescript
import { defineDJPayKitWidget } from '@djlemmor/djpaykit';

// Safely registers <djpaykit-widget> once.
defineDJPayKitWidget();
```

## Add the widget

```html
<djpaykit-widget
  api-url="/api/djpaykit/payment-methods"
  order-reference="ORDER-1001"
  amount="500.00"
  currency="PHP"
></djpaykit-widget>
```

## Attributes

| Attribute         | Required | Description                                       |
| ----------------- | -------- | ------------------------------------------------- |
| `api-url`         | Yes      | Endpoint used to retrieve enabled payment methods |
| `order-reference` | No       | Public order reference displayed to the customer  |
| `amount`          | No       | Payment amount displayed by the widget            |
| `currency`        | No       | ISO currency code, such as `PHP`                  |

## API response

The URL supplied through `api-url` should return JSON in this format:

```json
{
  "data": [
    {
      "id": "pm_01",
      "provider": "gcash",
      "displayName": "GCash",
      "accountName": "DJ Business",
      "accountNumber": "0917 123 4567",
      "qrImageUrl": "/api/djpaykit/payment-methods/pm_01/qr",
      "instructions": "Include your order number in the payment note."
    }
  ]
}
```

The first available payment method is selected automatically. Selecting another method updates the displayed details without requesting the payment-method list again.

## Events

### Provider selected

The widget dispatches `djpaykit:provider-selected` when the customer changes providers:

```typescript
const widget = document.querySelector('djpaykit-widget');

widget?.addEventListener('djpaykit:provider-selected', (event) => {
  const selection = event as CustomEvent<{
    paymentMethodId: string;
    provider: string;
  }>;

  // Only public identifiers are included in the event.
  console.log(selection.detail);
});
```

### QR downloaded

The widget dispatches `djpaykit:qr-downloaded` after a QR image is downloaded successfully:

```typescript
const widget = document.querySelector('djpaykit-widget');

widget?.addEventListener('djpaykit:qr-downloaded', (event) => {
  const download = event as CustomEvent<{
    paymentMethodId: string;
    provider: string;
  }>;

  // This can be used for checkout analytics.
  console.log(download.detail);
});
```

Neither event exposes account numbers or private storage paths.

## Color customization

Set the primary-color custom property on the component:

```html
<djpaykit-widget
  api-url="/api/djpaykit/payment-methods"
  style="--djpaykit-primary-color: #7c3aed"
></djpaykit-widget>
```

## Browser utilities

The package also exports its tested copy and download utilities:

```typescript
import { copyTextToClipboard, downloadQrImage } from '@djlemmor/djpaykit';

// Copies normalized text with a textarea fallback.
await copyTextToClipboard('0917 123 4567');

// Downloads a supported PNG, JPEG, or WebP QR image.
await downloadQrImage('/payment-methods/pm_01/qr', 'gcash');
```

## Laravel backend

The official Laravel adapter provides compatible public API routes, administrator routes, validation, migrations, and private QR-image storage:

```bash
# Installs the official Laravel 12 adapter.
composer require djlemmor/djpaykit-laravel:^0.1
```

Documentation: [DJPayKit Laravel](https://github.com/djlemmor/dj-paykit-laravel)

## Payment verification

DJPayKit does not automatically confirm that a payment was completed. The host checkout should keep the payment pending until it is manually reviewed or verified by another payment system.

## License

Released under the [MIT License](LICENSE).
