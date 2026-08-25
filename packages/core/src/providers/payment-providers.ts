import type { PaymentProviderDefinition, ProviderId } from '../types/provider';

/**
 * Central registry for all providers supported by DJPayKit.
 *
 * Future providers should be registered here instead of being
 * hard-coded throughout the widget.
 */
export const PAYMENT_PROVIDERS: Record<ProviderId, PaymentProviderDefinition> = {
  gcash: {
    id: 'gcash',
    displayName: 'GCash',
  },

  maya: {
    id: 'maya',
    displayName: 'Maya',
  },

  maribank: {
    id: 'maribank',
    displayName: 'MariBank',
  },
};

/**
 * Returns the configured definition for a supported provider.
 */
export function getPaymentProvider(providerId: ProviderId): PaymentProviderDefinition {
  return PAYMENT_PROVIDERS[providerId];
}
