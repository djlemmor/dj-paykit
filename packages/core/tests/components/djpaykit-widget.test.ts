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
});
