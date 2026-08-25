import { fetchPaymentMethods, PaymentMethodsApiError } from '../services/payment-methods-api';
import type { PaymentMethod } from '../types/payment-method';
import type { WidgetConfiguration } from '../types/widget-config';

/**
 * HTML tag used to place DJPayKit on a page.
 */
export const DJPAYKIT_TAG_NAME = 'djpaykit-widget';

const DEFAULT_CURRENCY = 'PHP';

/**
 * Represents the widget's current API state.
 */
type WidgetState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * Customer-facing DJPayKit Web Component.
 */
export class DJPayKitWidget extends HTMLElement {
  // Isolates the widget's HTML and CSS from the host website.
  readonly #shadowRoot: ShadowRoot;

  // Cancels a request when the URL changes or the widget is removed.
  #requestController: AbortController | null = null;

  // Stores payment methods loaded from the backend.
  #paymentMethods: PaymentMethod[] = [];

  // Tracks which interface state should be displayed.
  #state: WidgetState = 'loading';

  // Stores a safe, readable error for the customer.
  #errorMessage = '';

  /**
   * Attributes that cause the component to update.
   */
  static get observedAttributes(): string[] {
    return ['api-url', 'merchant-name', 'order-reference', 'amount', 'currency'];
  }

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: 'open' });
  }

  /**
   * Runs when the widget is inserted into a page.
   */
  connectedCallback(): void {
    this.render();

    // Starts loading enabled payment methods.
    void this.loadPaymentMethods();
  }

  /**
   * Cancels active requests when the widget leaves the page.
   */
  disconnectedCallback(): void {
    this.cancelActiveRequest();
  }

  /**
   * Responds when a watched HTML attribute changes.
   */
  attributeChangedCallback(
    attributeName: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (attributeName === 'api-url') {
      // A new endpoint requires a fresh API request.
      void this.loadPaymentMethods();

      return;
    }

    // Payment-context changes only require a visual update.
    this.render();
  }

  /**
   * Retrieves payment methods and updates the widget state.
   */
  private async loadPaymentMethods(): Promise<void> {
    const configuration = this.getConfiguration();

    // Prevents an old request from changing the latest widget state.
    this.cancelActiveRequest();

    this.#paymentMethods = [];
    this.#errorMessage = '';

    if (!configuration.apiUrl) {
      this.#state = 'error';
      this.#errorMessage =
        'Payment methods cannot be loaded because the api-url attribute is missing.';
      this.render();

      return;
    }

    this.#state = 'loading';
    this.render();

    const controller = new AbortController();

    this.#requestController = controller;

    try {
      const paymentMethods = await fetchPaymentMethods(configuration.apiUrl, controller.signal);

      /*
       * Ignores the response if another request replaced this one while
       * it was still loading.
       */
      if (this.#requestController !== controller) {
        return;
      }

      this.#paymentMethods = paymentMethods;
      this.#state = paymentMethods.length > 0 ? 'ready' : 'empty';

      this.render();
      this.dispatchReadyEvent();
    } catch (error: unknown) {
      // AbortError is expected when an outdated request is cancelled.
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      if (this.#requestController !== controller) {
        return;
      }

      this.#state = 'error';
      this.#errorMessage =
        error instanceof PaymentMethodsApiError
          ? error.message
          : 'Unable to load payment methods. Please try again.';

      this.render();
    } finally {
      // Only clear the controller if this is still the latest request.
      if (this.#requestController === controller) {
        this.#requestController = null;
      }
    }
  }

  /**
   * Cancels the currently active API request.
   */
  private cancelActiveRequest(): void {
    this.#requestController?.abort();
    this.#requestController = null;
  }

  /**
   * Announces that the widget finished loading.
   */
  private dispatchReadyEvent(): void {
    this.dispatchEvent(
      new CustomEvent('djpaykit:ready', {
        bubbles: true,
        composed: true,

        // Only non-sensitive information is included in the event.
        detail: {
          paymentMethodCount: this.#paymentMethods.length,
        },
      }),
    );
  }

  /**
   * Reads and validates the component's attributes.
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
   * Reads an attribute and treats empty values as null.
   */
  private readTextAttribute(attributeName: string): string | null {
    const value = this.getAttribute(attributeName)?.trim();

    return value ? value : null;
  }

  /**
   * Converts the amount attribute into a valid non-negative number.
   */
  private readAmount(): number | null {
    const rawAmount = this.getAttribute('amount')?.trim();

    if (!rawAmount) {
      return null;
    }

    const amount = Number(rawAmount);

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

    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      return DEFAULT_CURRENCY;
    }

    return currency;
  }

  /**
   * Formats money using Philippine locale conventions.
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
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  }

  /**
   * Renders the component's structure and current state.
   */
  private render(): void {
    const configuration = this.getConfiguration();

    /*
     * Only package-controlled markup is inserted through innerHTML.
     * API and attribute values are inserted separately with textContent.
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

        .state {
          margin-top: 16px;
          line-height: 1.5;
        }

        .message {
          margin: 0;
          color: #4b5563;
        }

        .error-message {
          color: #b91c1c;
        }

        .retry-button {
          margin-top: 12px;
          padding: 8px 14px;
          border: 0;
          border-radius: 6px;
          background: var(--djpaykit-primary-color, #2563eb);
          color: #ffffff;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .retry-button:focus-visible {
          outline: 3px solid #93c5fd;
          outline-offset: 2px;
        }

        .provider-list {
          margin: 12px 0 0;
          padding-left: 24px;
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

        <div class="state" aria-live="polite">
          <p class="message" data-loading role="status" hidden>
            Loading payment methods…
          </p>

          <p class="message" data-empty role="status" hidden>
            No payment methods are currently available.
          </p>

          <div data-error hidden>
            <p class="message error-message" data-error-message role="alert"></p>
            <button class="retry-button" data-retry type="button">
              Try again
            </button>
          </div>

          <div data-ready hidden>
            <p class="message" data-summary role="status"></p>
            <ul class="provider-list" data-provider-list></ul>
          </div>
        </div>
      </section>
    `;

    this.renderPaymentContext(configuration);
    this.renderApiState();
  }

  /**
   * Displays the merchant, order reference, and amount.
   */
  private renderPaymentContext(configuration: WidgetConfiguration): void {
    const title = this.#shadowRoot.querySelector<HTMLElement>('.title');
    const context = this.#shadowRoot.querySelector<HTMLElement>('[data-context]');

    if (configuration.merchantName && title) {
      title.textContent = configuration.merchantName;
    }

    if (configuration.orderReference) {
      const row = this.#shadowRoot.querySelector<HTMLElement>('[data-order-row]');
      const value = this.#shadowRoot.querySelector<HTMLElement>('[data-order-reference]');

      if (context && row && value) {
        context.hidden = false;
        row.hidden = false;
        value.textContent = configuration.orderReference;
      }
    }

    if (configuration.amount !== null) {
      const row = this.#shadowRoot.querySelector<HTMLElement>('[data-amount-row]');
      const value = this.#shadowRoot.querySelector<HTMLElement>('[data-amount]');

      if (context && row && value) {
        context.hidden = false;
        row.hidden = false;
        value.textContent = this.formatAmount(configuration.amount, configuration.currency);
      }
    }
  }

  /**
   * Displays loading, empty, error, or ready content.
   */
  private renderApiState(): void {
    if (this.#state === 'loading') {
      const loading = this.#shadowRoot.querySelector<HTMLElement>('[data-loading]');

      if (loading) {
        loading.hidden = false;
      }

      return;
    }

    if (this.#state === 'empty') {
      const empty = this.#shadowRoot.querySelector<HTMLElement>('[data-empty]');

      if (empty) {
        empty.hidden = false;
      }

      return;
    }

    if (this.#state === 'error') {
      const error = this.#shadowRoot.querySelector<HTMLElement>('[data-error]');
      const message = this.#shadowRoot.querySelector<HTMLElement>('[data-error-message]');
      const retry = this.#shadowRoot.querySelector<HTMLButtonElement>('[data-retry]');

      if (error && message) {
        error.hidden = false;
        message.textContent = this.#errorMessage;
      }

      // Retry starts the same safe loading process again.
      retry?.addEventListener('click', () => {
        void this.loadPaymentMethods();
      });

      return;
    }

    const ready = this.#shadowRoot.querySelector<HTMLElement>('[data-ready]');
    const summary = this.#shadowRoot.querySelector<HTMLElement>('[data-summary]');
    const list = this.#shadowRoot.querySelector<HTMLUListElement>('[data-provider-list]');

    if (!ready || !summary || !list) {
      return;
    }

    ready.hidden = false;

    const count = this.#paymentMethods.length;

    summary.textContent = `${count} payment ${count === 1 ? 'method' : 'methods'} available.`;

    for (const paymentMethod of this.#paymentMethods) {
      const item = document.createElement('li');

      // textContent prevents provider and account names from becoming HTML.
      item.textContent = `${paymentMethod.displayName} — ${paymentMethod.accountName}`;
      list.append(item);
    }
  }
}

/**
 * Registers the Web Component once.
 */
export function defineDJPayKitWidget(): void {
  if (!customElements.get(DJPAYKIT_TAG_NAME)) {
    customElements.define(DJPAYKIT_TAG_NAME, DJPayKitWidget);
  }
}
