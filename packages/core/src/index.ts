import {
  defineDJPayKitWidget,
  DJPayKitWidget,
  DJPAYKIT_TAG_NAME,
} from './components/djpaykit-widget';

/*
 * Registers <djpaykit-widget> automatically when the package loads.
 * This allows plain HTML users to use the widget with one script import.
 */
defineDJPayKitWidget();

/*
 * Exports public types and utilities for developers installing the
 * package through npm.
 */
export { defineDJPayKitWidget, DJPayKitWidget, DJPAYKIT_TAG_NAME };

export { PAYMENT_PROVIDERS, getPaymentProvider } from './providers/payment-providers';

export { PROVIDER_IDS, type PaymentProviderDefinition, type ProviderId } from './types/provider';

export type { PaymentMethod, PaymentMethodsResponse } from './types/payment-method';

// Makes the widget configuration type available to npm users.
export type { WidgetConfiguration } from './types/widget-config';
