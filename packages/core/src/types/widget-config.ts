/**
 * Contains configuration read from the <djpaykit-widget> HTML attributes.
 */
export interface WidgetConfiguration {
  // Backend endpoint used to retrieve enabled payment methods.
  apiUrl: string | null;

  // Optional person, store, or business name shown above the widget.
  merchantName: string | null;

  // Human-readable reference such as ORDER-1001.
  orderReference: string | null;

  // Expected payment amount. Null means the host did not provide one.
  amount: number | null;

  // Three-letter currency code. DJPayKit defaults to PHP.
  currency: string;
}
