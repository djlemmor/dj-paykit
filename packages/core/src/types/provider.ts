/**
 * Central list of provider identifiers supported by the MVP.
 *
 * `as const` prevents TypeScript from treating these values as
 * general strings.
 */
export const PROVIDER_IDS = ['gcash', 'maya', 'maribank'] as const;

/**
 * Produces the type:
 * 'gcash' | 'maya' | 'maribank'
 */
export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Describes information that DJPayKit knows about each provider.
 */
export interface PaymentProviderDefinition {
  // Stable value used by the API and widget logic.
  id: ProviderId;

  // Human-readable name displayed to customers.
  displayName: string;
}
