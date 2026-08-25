import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPaymentMethods,
  PaymentMethodsApiError,
} from '../../src/services/payment-methods-api';

/**
 * Creates the small portion of a browser Response needed by these tests.
 */
function createResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,

    // Simulates response.json() without starting a real web server.
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('fetchPaymentMethods', () => {
  afterEach(() => {
    // Restores the real browser fetch function after every test.
    vi.unstubAllGlobals();
  });

  it('returns valid payment methods from the API', async () => {
    const responseBody = {
      data: [
        {
          id: 'pm_01',
          provider: 'gcash',
          displayName: 'GCash',
          accountName: 'DJ Store',
          accountNumber: null,
          qrImageUrl: '/api/djpaykit/payment-methods/pm_01/qr',
          instructions: 'Use your order number as the payment note.',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(createResponse(responseBody));

    // Prevents the test from making a real network request.
    vi.stubGlobal('fetch', fetchMock);

    const paymentMethods = await fetchPaymentMethods('/api/djpaykit/payment-methods');

    expect(paymentMethods).toEqual(responseBody.data);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/djpaykit/payment-methods',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }),
    );
  });

  it('throws a readable error for a failed HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createResponse({}, 500)));

    const request = fetchPaymentMethods('/api/djpaykit/payment-methods');

    await expect(request).rejects.toMatchObject({
      name: 'PaymentMethodsApiError',
      status: 500,
    });

    await expect(request).rejects.toThrow('HTTP 500');
  });

  it('rejects an invalid API response structure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createResponse({
          data: [
            {
              // The required provider and QR image fields are missing.
              id: 'pm_invalid',
              accountName: 'DJ Store',
            },
          ],
        }),
      ),
    );

    await expect(fetchPaymentMethods('/api/djpaykit/payment-methods')).rejects.toThrow(
      'invalid response',
    );
  });

  it('wraps network failures in a DJPayKit API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const request = fetchPaymentMethods('/api/djpaykit/payment-methods');

    await expect(request).rejects.toBeInstanceOf(PaymentMethodsApiError);

    await expect(request).rejects.toThrow('Unable to connect to the payment-method service');
  });
});
