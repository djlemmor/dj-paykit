import type { PaymentMethod } from '../types/payment-method';
import { PROVIDER_IDS, type ProviderId } from '../types/provider';

/**
 * Error produced when DJPayKit cannot retrieve valid payment-method data.
 */
export class PaymentMethodsApiError extends Error {
  // HTTP status is available when the server returned a response.
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);

    this.name = 'PaymentMethodsApiError';
    this.status = status;
  }
}

/**
 * Checks that a value is an object that can be inspected safely.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks that a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks fields that may contain text or null.
 */
function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/**
 * Checks whether a provider identifier is supported by this widget version.
 */
function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDER_IDS.includes(value as ProviderId);
}

/**
 * Validates one payment method received from an untrusted API response.
 *
 * TypeScript types disappear at runtime, so data received over the network
 * must still be checked before the widget uses it.
 */
function isPaymentMethod(value: unknown): value is PaymentMethod {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isProviderId(value.provider) &&
    isNonEmptyString(value.displayName) &&
    isNonEmptyString(value.accountName) &&
    isNullableString(value.accountNumber) &&
    isNonEmptyString(value.qrImageUrl) &&
    isNullableString(value.instructions)
  );
}

/**
 * Retrieves enabled payment methods from a DJPayKit backend adapter.
 */
export async function fetchPaymentMethods(
  apiUrl: string,
  signal?: AbortSignal,
): Promise<PaymentMethod[]> {
  const normalizedUrl = apiUrl.trim();

  if (!normalizedUrl) {
    throw new PaymentMethodsApiError('A payment-method API URL is required.');
  }

  let response: Response;

  try {
    response = await fetch(normalizedUrl, {
      method: 'GET',

      // Asks the backend to return JSON instead of an HTML error page.
      headers: {
        Accept: 'application/json',
      },

      // Allows the widget to cancel an outdated request.
      signal,
    });
  } catch (error: unknown) {
    /*
     * An aborted request is expected when the widget is removed or its
     * api-url changes, so preserve the browser's AbortError.
     */
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new PaymentMethodsApiError('Unable to connect to the payment-method service.');
  }

  if (!response.ok) {
    throw new PaymentMethodsApiError(
      `Unable to load payment methods. The server returned HTTP ${response.status}.`,
      response.status,
    );
  }

  let payload: unknown;

  try {
    // The value remains unknown until its runtime structure is validated.
    payload = (await response.json()) as unknown;
  } catch {
    throw new PaymentMethodsApiError(
      'The payment-method service returned invalid JSON.',
      response.status,
    );
  }

  if (!isRecord(payload) || !Array.isArray(payload.data) || !payload.data.every(isPaymentMethod)) {
    throw new PaymentMethodsApiError(
      'The payment-method service returned an invalid response.',
      response.status,
    );
  }

  return payload.data;
}
