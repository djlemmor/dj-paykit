/**
 * HTML tag used to place the DJPayKit widget on a page.
 */
export const DJPAYKIT_TAG_NAME = 'djpaykit-widget';

/**
 * Customer-facing DJPayKit Web Component.
 *
 * This initial version only renders a loading state. Fetching and
 * displaying payment methods will be added in the next development steps.
 */
export class DJPayKitWidget extends HTMLElement {
  // The shadow root prevents the widget's styles from affecting the host website.
  readonly #shadowRoot: ShadowRoot;

  constructor() {
    super();

    // Creates an accessible shadow root that can be inspected by browser tools.
    this.#shadowRoot = this.attachShadow({ mode: 'open' });
  }

  /**
   * Runs automatically whenever the element is added to a web page.
   */
  connectedCallback(): void {
    this.render();
  }

  /**
   * Renders the widget's initial interface.
   */
  private render(): void {
    /*
     * This markup is currently static and controlled by the package.
     * Later, API values will be inserted using safe DOM methods such as
     * textContent instead of placing user-provided values in innerHTML.
     */
    this.#shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(
            --djpaykit-font-family,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif
          );
          color: #111827;
        }

        .widget {
          box-sizing: border-box;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          border: 1px solid #d1d5db;
          border-radius: var(--djpaykit-border-radius, 12px);
          background: #ffffff;
        }

        .title {
          margin: 0 0 8px;
          font-size: 1.25rem;
          line-height: 1.5;
        }

        .status {
          margin: 0;
          color: #4b5563;
          line-height: 1.5;
        }
      </style>

      <section class="widget" aria-labelledby="djpaykit-title">
        <h2 id="djpaykit-title" class="title">Pay with QR</h2>

        <!-- role="status" allows screen readers to announce loading changes. -->
        <p class="status" role="status">Loading payment methods…</p>
      </section>
    `;
  }
}

/**
 * Safely registers the component with the browser.
 *
 * The check prevents an error if the package is imported more than once.
 */
export function defineDJPayKitWidget(): void {
  if (!customElements.get(DJPAYKIT_TAG_NAME)) {
    customElements.define(DJPAYKIT_TAG_NAME, DJPayKitWidget);
  }
}
