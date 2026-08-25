import type { PaymentMethod } from '../types/payment-method';

/**
 * Information needed to render the selectable payment methods.
 */
interface PaymentMethodViewOptions {
  root: ShadowRoot;
  paymentMethods: readonly PaymentMethod[];
  selectedPaymentMethodId: string | null;
  onProviderSelected: (paymentMethod: PaymentMethod) => void;
}

/**
 * Renders provider buttons and the currently selected payment method.
 */
export function renderPaymentMethodView({
  root,
  paymentMethods,
  selectedPaymentMethodId,
  onProviderSelected,
}: PaymentMethodViewOptions): void {
  const selector = root.querySelector<HTMLElement>('[data-provider-selector]');

  /*
   * Falls back to the first enabled method when no selection exists.
   */
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0] ??
    null;

  if (!selector || !selectedPaymentMethod) {
    return;
  }

  for (const paymentMethod of paymentMethods) {
    const button = document.createElement('button');
    const isSelected = paymentMethod.id === selectedPaymentMethod.id;

    button.type = 'button';
    button.className = 'provider-button';
    button.textContent = paymentMethod.displayName;
    button.dataset.paymentMethodId = paymentMethod.id;

    /*
     * aria-pressed communicates the selected provider to screen readers.
     * Native buttons already support Enter, Space, and keyboard focus.
     */
    button.setAttribute('aria-pressed', String(isSelected));

    button.addEventListener('click', () => {
      if (!isSelected) {
        onProviderSelected(paymentMethod);
      }
    });

    selector.append(button);
  }

  renderSelectedPaymentMethod(root, selectedPaymentMethod);
}

/**
 * Displays account information and the QR image for one provider.
 */
function renderSelectedPaymentMethod(root: ShadowRoot, paymentMethod: PaymentMethod): void {
  const title = root.querySelector<HTMLElement>('[data-selected-provider]');
  const accountName = root.querySelector<HTMLElement>('[data-account-name]');
  const accountNumberRow = root.querySelector<HTMLElement>('[data-account-number-row]');
  const accountNumber = root.querySelector<HTMLElement>('[data-account-number]');
  const qrImage = root.querySelector<HTMLImageElement>('[data-qr-image]');
  const qrError = root.querySelector<HTMLElement>('[data-qr-error]');
  const instructionsRow = root.querySelector<HTMLElement>('[data-instructions-row]');
  const instructions = root.querySelector<HTMLElement>('[data-instructions]');

  if (title) {
    title.textContent = paymentMethod.displayName;
  }

  if (accountName) {
    accountName.textContent = paymentMethod.accountName;
  }

  if (accountNumberRow && accountNumber && paymentMethod.accountNumber?.trim()) {
    accountNumberRow.hidden = false;
    accountNumber.textContent = paymentMethod.accountNumber;
  }

  if (qrImage) {
    qrImage.src = paymentMethod.qrImageUrl;
    qrImage.alt = `${paymentMethod.displayName} payment QR code for ` + paymentMethod.accountName;

    /*
     * Replaces a broken QR image with a readable error message.
     */
    qrImage.addEventListener('error', () => {
      qrImage.hidden = true;

      if (qrError) {
        qrError.hidden = false;
      }
    });
  }

  if (instructionsRow && instructions && paymentMethod.instructions?.trim()) {
    instructionsRow.hidden = false;
    instructions.textContent = paymentMethod.instructions;
  }
}
