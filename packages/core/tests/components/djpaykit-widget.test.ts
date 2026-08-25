import { afterEach, describe, expect, it } from 'vitest';

import { defineDJPayKitWidget, DJPayKitWidget, DJPAYKIT_TAG_NAME } from '../../src';

describe('DJPayKitWidget', () => {
  afterEach(() => {
    // Removes test elements so one test cannot affect another test.
    document.body.innerHTML = '';
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
    // Creates the component exactly as a host website would.
    const widget = document.createElement(DJPAYKIT_TAG_NAME);

    document.body.append(widget);

    // Reads content protected inside the component's Shadow DOM.
    const shadowRoot = widget.shadowRoot;
    const status = shadowRoot?.querySelector<HTMLElement>('[role="status"]');

    expect(shadowRoot).not.toBeNull();
    expect(status?.textContent).toContain('Loading payment methods');
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
});
