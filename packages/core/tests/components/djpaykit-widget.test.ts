import { afterEach, describe, expect, it, vi } from 'vitest';

import { defineDJPayKitWidget, DJPayKitWidget, DJPAYKIT_TAG_NAME } from '../../src';

/**
 * Creates the part of an HTTP response required by component tests.
 */
function createResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

/**
 * Valid response reused by loading and retry tests.
 */
const paymentMethodsResponse = {
  data: [
    {
      id: 'pm_01',
      provider: 'gcash',
      displayName: 'GCash',
      accountName: 'DJ Store',
      accountNumber: null,
      qrImageUrl: '/api/djpaykit/payment-methods/pm_01/qr',
      instructions: null,
    },
  ],
};

describe('DJPayKitWidget', () => {
  afterEach(() => {
    // Removes test elements so tests cannot affect one another.
    document.body.innerHTML = '';

    // Restores mocked methods such as the anchor's click method.
    vi.restoreAllMocks();

    // Restores fetch, URL, navigator, and other stubbed globals.
    vi.unstubAllGlobals();
  });

  it('registers the custom element', () => {
    // Confirms that <djpaykit-widget> is registered with the browser.
    expect(customElements.get(DJPAYKIT_TAG_NAME)).toBe(DJPayKitWidget);
  });

  it('can safely be registered more than once', () => {
    /*
     * Defining the same custom element twice normally throws an error.
     * Our helper must protect applications that import the package twice.
     */
    expect(() => defineDJPayKitWidget()).not.toThrow();
    expect(() => defineDJPayKitWidget()).not.toThrow();
  });

  it('renders an accessible loading state', () => {
    /*
     * Keeps fetch pending so we can inspect the loading interface before
     * a server response arrives.
     */
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // Intentionally left unresolved for this loading-state test.
          }),
      ),
    );

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    document.body.append(widget);

    const loading = widget.shadowRoot?.querySelector<HTMLElement>('[data-loading]');

    expect(loading?.hidden).toBe(false);
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.textContent).toContain('Loading payment methods');
  });

  it('uses a section with an accessible title', () => {
    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    document.body.append(widget);

    const section = widget.shadowRoot?.querySelector('section');
    const title = widget.shadowRoot?.querySelector('h2');

    expect(section?.getAttribute('aria-labelledby')).toBe('djpaykit-title');
    expect(title?.id).toBe('djpaykit-title');
    expect(title?.textContent).toBe('Pay with QR');
  });

  it('displays the merchant and payment context attributes', () => {
    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    // Simulates configuration supplied by a checkout page.
    widget.setAttribute('merchant-name', 'DJ Store');
    widget.setAttribute('order-reference', 'ORDER-1001');
    widget.setAttribute('amount', '500');
    widget.setAttribute('currency', 'PHP');

    document.body.append(widget);

    const title = widget.shadowRoot?.querySelector('.title');
    const orderReference = widget.shadowRoot?.querySelector('[data-order-reference]');
    const amount = widget.shadowRoot?.querySelector('[data-amount]');

    expect(title?.textContent).toBe('DJ Store');
    expect(orderReference?.textContent).toBe('ORDER-1001');
    expect(amount?.textContent).toContain('₱');
    expect(amount?.textContent).toContain('500.00');
  });

  it('defaults the currency to PHP', () => {
    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    // No currency attribute is provided.
    widget.setAttribute('amount', '250');

    document.body.append(widget);

    const amount = widget.shadowRoot?.querySelector('[data-amount]');

    expect(amount?.textContent).toContain('₱');
    expect(amount?.textContent).toContain('250.00');
  });

  it('rerenders when a payment-context attribute changes', () => {
    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    document.body.append(widget);

    // Changing an observed attribute should update the rendered component.
    widget.setAttribute('order-reference', 'ORDER-2002');

    const orderReference = widget.shadowRoot?.querySelector('[data-order-reference]');

    expect(orderReference?.textContent).toBe('ORDER-2002');
  });

  it('loads and displays available payment methods', async () => {
    const readyListener = vi.fn();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createResponse(paymentMethodsResponse)));

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');
    widget.addEventListener('djpaykit:ready', readyListener);

    document.body.append(widget);

    /*
     * Waits until the API response has been processed and the ready state
     * is displayed. At this point, the download listener is attached.
     */
    await vi.waitFor(() => {
      const readyState = widget.shadowRoot?.querySelector<HTMLElement>('[data-ready]');
      const selectedProvider = widget.shadowRoot?.querySelector('[data-selected-provider]');

      expect(readyState?.hidden).toBe(false);
      expect(selectedProvider?.textContent).toBe('GCash');
    });

    // Confirms the documented ready event was dispatched.
    expect(readyListener).toHaveBeenCalledOnce();
  });

  it('shows an empty state when no methods are enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createResponse({
          data: [],
        }),
      ),
    );

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    document.body.append(widget);

    await vi.waitFor(() => {
      const empty = widget.shadowRoot?.querySelector<HTMLElement>('[data-empty]');

      expect(empty?.hidden).toBe(false);
      expect(empty?.textContent).toContain('No payment methods are currently available');
    });
  });

  it('allows a failed request to be retried', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse({}, 500))
      .mockResolvedValueOnce(createResponse(paymentMethodsResponse));

    vi.stubGlobal('fetch', fetchMock);

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    document.body.append(widget);

    await vi.waitFor(() => {
      const error = widget.shadowRoot?.querySelector('[data-error-message]');

      expect(error?.textContent).toContain('HTTP 500');
    });

    const retryButton = widget.shadowRoot?.querySelector<HTMLButtonElement>('[data-retry]');

    // Simulates the customer selecting the retry action.
    retryButton?.click();

    await vi.waitFor(() => {
      const providerList = widget.shadowRoot?.querySelector('[data-payment-details]');

      expect(providerList?.textContent).toContain('GCash');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('switches the selected provider without reloading the page', async () => {
    const providerSelectedListener = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createResponse({
          data: [
            paymentMethodsResponse.data[0],
            {
              id: 'pm_02',
              provider: 'maya',
              displayName: 'Maya',
              accountName: 'DJ Business',
              accountNumber: '0912 345 6789',
              qrImageUrl: '/api/djpaykit/payment-methods/pm_02/qr',
              instructions: 'Enter your order number in the note.',
            },
          ],
        }),
      ),
    );

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    widget.addEventListener('djpaykit:provider-selected', providerSelectedListener);

    document.body.append(widget);

    await vi.waitFor(() => {
      const buttons = widget.shadowRoot?.querySelectorAll('[data-payment-method-id]');

      expect(buttons?.length).toBe(2);
    });

    const mayaButton = widget.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-payment-method-id="pm_02"]',
    );

    mayaButton?.click();

    await vi.waitFor(() => {
      const selectedProvider = widget.shadowRoot?.querySelector('[data-selected-provider]');
      const accountName = widget.shadowRoot?.querySelector('[data-account-name]');
      const accountNumber = widget.shadowRoot?.querySelector('[data-account-number]');
      const qrImage = widget.shadowRoot?.querySelector<HTMLImageElement>('[data-qr-image]');

      expect(selectedProvider?.textContent).toBe('Maya');
      expect(accountName?.textContent).toBe('DJ Business');
      expect(accountNumber?.textContent).toBe('0912 345 6789');
      expect(qrImage?.getAttribute('src')).toBe('/api/djpaykit/payment-methods/pm_02/qr');
    });

    expect(providerSelectedListener).toHaveBeenCalledOnce();
  });

  it('copies the selected account number', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createResponse({
          data: [
            {
              ...paymentMethodsResponse.data[0],
              accountNumber: '0912 345 6789',
            },
          ],
        }),
      ),
    );

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    document.body.append(widget);

    await vi.waitFor(() => {
      const copyButton = widget.shadowRoot?.querySelector<HTMLButtonElement>(
        '[data-copy-account-number]',
      );

      expect(copyButton?.hidden).toBe(false);
    });

    const copyButton = widget.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-copy-account-number]',
    );

    copyButton?.click();

    await vi.waitFor(() => {
      const feedback = widget.shadowRoot?.querySelector('[data-action-feedback]');

      expect(feedback?.textContent).toBe('Copied');
    });

    expect(writeText).toHaveBeenCalledWith('0912 345 6789');
  });

  it('dispatches an event after downloading a QR image', async () => {
    const downloadedListener = vi.fn();

    /*
     * The first response loads payment methods.
     * The second response downloads the selected QR image.
     */
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(paymentMethodsResponse))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(
          new Blob(['qr-image'], {
            type: 'image/png',
          }),
        ),
      } as unknown as Response);

    vi.stubGlobal('fetch', fetchMock);

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:qr-image'),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      // Prevents jsdom from attempting browser navigation.
    });

    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    widget.setAttribute('api-url', '/api/djpaykit/payment-methods');

    widget.addEventListener('djpaykit:qr-downloaded', downloadedListener);

    document.body.append(widget);

    /*
     * Waits for the payment method to finish loading.
     * The download event listener is attached during this ready render.
     */
    await vi.waitFor(() => {
      const readyState = widget.shadowRoot?.querySelector<HTMLElement>('[data-ready]');
      const selectedProvider = widget.shadowRoot?.querySelector('[data-selected-provider]');

      expect(readyState?.hidden).toBe(false);
      expect(selectedProvider?.textContent).toBe('GCash');
    });

    const downloadButton =
      widget.shadowRoot?.querySelector<HTMLButtonElement>('[data-download-qr]');

    expect(downloadButton).not.toBeNull();

    // Starts the simulated QR download.
    downloadButton?.click();

    /*
     * Waiting for the feedback provides a clearer failure if the download
     * utility encounters an error.
     */
    await vi.waitFor(() => {
      const feedback = widget.shadowRoot?.querySelector('[data-action-feedback]');

      expect(feedback?.textContent).toBe('QR downloaded');
    });

    expect(downloadedListener).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
