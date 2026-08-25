import type { WidgetConfiguration } from '../types/widget-config';

/**
 * HTML tag used to place the DJPayKit widget on a page.
 */
export const DJPAYKIT_TAG_NAME = 'djpaykit-widget';

/**
 * Currency used when the host website does not provide one.
 */
const DEFAULT_CURRENCY = 'PHP';

/**
 * Customer-facing DJPayKit Web Component.
 */
export class DJPayKitWidget extends HTMLElement {
  // The Shadow DOM prevents widget styles from affecting the host website.
  readonly #shadowRoot: ShadowRoot;

  /**
   * Tells the browser which HTML attributes should trigger an update.
   */
  static get observedAttributes(): string[] {
    return ['api-url', 'merchant-name', 'order-reference', 'amount', 'currency'];
  }

  constructor() {
    super();

    // Creates the component's isolated DOM and style area.
    this.#shadowRoot = this.attachShadow({ mode: 'open' });
  }

  /**
   * Runs when the widget is inserted into the page.
   */
  connectedCallback(): void {
    this.render();
  }

  /**
   * Runs when one of the observed attributes changes.
   */
  attributeChangedCallback(
    _attributeName: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    /*
     * Avoids unnecessary rendering when the value did not actually change.
     * isConnected prevents rendering before the component enters the page.
     */
    if (oldValue !== newValue && this.isConnected) {
      this.render();
    }
  }

  /**
   * Reads and validates the component's HTML attributes.
   */
  private getConfiguration(): WidgetConfiguration {
    return {
      apiUrl: this.readTextAttribute('api-url'),
      merchantName: this.readTextAttribute('merchant-name'),
      orderReference: this.readTextAttribute('order-reference'),
      amount: this.readAmount(),
      currency: this.readCurrency(),
    };
  }

  /**
   * Reads an attribute and converts empty text to null.
   */
  private readTextAttribute(attributeName: string): string | null {
    const value = this.getAttribute(attributeName)?.trim();

    return value ? value : null;
  }

  /**
   * Converts the amount attribute into a safe non-negative number.
   */
  private readAmount(): number | null {
    const rawAmount = this.getAttribute('amount')?.trim();

    if (!rawAmount) {
      return null;
    }

    const amount = Number(rawAmount);

    // Money cannot be NaN, infinite, or negative.
    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }

    return amount;
  }

  /**
   * Reads a three-letter currency code and defaults to PHP.
   */
  private readCurrency(): string {
    const currency = this.getAttribute('currency')?.trim().toUpperCase();

    // Accepts currency-shaped codes such as PHP, USD, or EUR.
    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      return DEFAULT_CURRENCY;
    }

    return currency;
  }

  /**
   * Formats a number using Philippine locale conventions.
   */
  private formatAmount(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      /*
       * Falls back to PHP if a browser does not recognize the supplied
       * currency code.
       */
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  }

  /**
   * Renders the current payment context and loading state.
   */
  private render(): void {
    const configuration = this.getConfiguration();

    /*
     * Only package-controlled markup is assigned through innerHTML.
     * Merchant and order values are inserted separately using textContent.
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

        [hidden] {
          display: none !important;
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
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }

        .context {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: #f3f4f6;
        }

        .context-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin: 0;
          line-height: 1.5;
        }

        .context-row + .context-row {
          margin-top: 8px;
        }

        .context-label {
          color: #4b5563;
        }

        .context-value {
          overflow-wrap: anywhere;
          text-align: right;
        }

        .status {
          margin: 16px 0 0;
          color: #4b5563;
          line-height: 1.5;
        }
      </style>

      <section class="widget" aria-labelledby="djpaykit-title">
        <h2 id="djpaykit-title" class="title">Pay with QR</h2>

        <div class="context" data-context hidden>
          <p class="context-row" data-order-row hidden>
            <span class="context-label">Order</span>
            <strong class="context-value" data-order-reference></strong>
          </p>

          <p class="context-row" data-amount-row hidden>
            <span class="context-label">Amount</span>
            <strong class="context-value" data-amount></strong>
          </p>
        </div>

        <!-- Screen readers announce the current loading status. -->
        <p class="status" role="status">Loading payment methods…</p>
      </section>
    `;

    const title = this.#shadowRoot.querySelector<HTMLElement>('.title');
    const context = this.#shadowRoot.querySelector<HTMLElement>('[data-context]');

    if (configuration.merchantName && title) {
      // textContent safely escapes merchant-provided text.
      title.textContent = configuration.merchantName;
    }

    if (configuration.orderReference) {
      const orderRow = this.#shadowRoot.querySelector<HTMLElement>('[data-order-row]');
      const orderReference = this.#shadowRoot.querySelector<HTMLElement>('[data-order-reference]');

      if (context && orderRow && orderReference) {
        context.hidden = false;
        orderRow.hidden = false;
        orderReference.textContent = configuration.orderReference;
      }
    }

    if (configuration.amount !== null) {
      const amountRow = this.#shadowRoot.querySelector<HTMLElement>('[data-amount-row]');
      const amount = this.#shadowRoot.querySelector<HTMLElement>('[data-amount]');

      if (context && amountRow && amount) {
        context.hidden = false;
        amountRow.hidden = false;
        amount.textContent = this.formatAmount(configuration.amount, configuration.currency);
      }
    }
  }
}

/**
 * Registers the component if it has not already been registered.
 */
export function defineDJPayKitWidget(): void {
  if (!customElements.get(DJPAYKIT_TAG_NAME)) {
    customElements.define(DJPAYKIT_TAG_NAME, DJPayKitWidget);
  }
}
