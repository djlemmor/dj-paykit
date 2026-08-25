import { describe, expect, it } from 'vitest';

import { getPaymentProvider, PAYMENT_PROVIDERS } from '../../src/providers/payment-providers';
import { PROVIDER_IDS } from '../../src/types/provider';

describe('payment provider registry', () => {
  it('contains every supported provider', () => {
    /*
     * Verifies that adding a provider identifier without adding its
     * corresponding provider definition will cause this test to fail.
     */
    expect(Object.keys(PAYMENT_PROVIDERS)).toEqual(PROVIDER_IDS);
  });

  it('returns the correct GCash definition', () => {
    // Retrieves one provider through the public helper function.
    const provider = getPaymentProvider('gcash');

    expect(provider).toEqual({
      id: 'gcash',
      displayName: 'GCash',
    });
  });

  it('uses the required display names', () => {
    // Confirms the names customers will see in the widget.
    expect(PAYMENT_PROVIDERS.gcash.displayName).toBe('GCash');
    expect(PAYMENT_PROVIDERS.maya.displayName).toBe('Maya');
    expect(PAYMENT_PROVIDERS.maribank.displayName).toBe('MariBank');
  });
});
