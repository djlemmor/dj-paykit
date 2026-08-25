import type { PaymentMethod } from '../types/payment-method';
import { copyTextToClipboard } from '../utils/clipboard';
import { downloadQrImage } from '../utils/qr-download';

/**
 * Information needed to render the selectable payment methods.
 */
interface PaymentMethodViewOptions {
  root: ShadowRoot;
  paymentMethods: readonly PaymentMethod[];
  selectedPaymentMethodId: string | null;
  onProviderSelected: (paymentMethod: PaymentMethod) => void;
  onQrDownloaded: (paymentMethod: PaymentMethod) => void;
}

/**
 * Renders provider buttons and the selected payment method.
 */
export function renderPaymentMethodView({
  root,
  paymentMethods,
  selectedPaymentMethodId,
  onProviderSelected,
  onQrDownloaded,
}: PaymentMethodViewOptions): void {
  const selector = root.querySelector<HTMLElement>('[data-provider-selector]');

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
    button.setAttribute('aria-pressed', String(isSelected));

    button.addEventListener('click', () => {
      if (!isSelected) {
        onProviderSelected(paymentMethod);
      }
    });

    selector.append(button);
  }

  renderSelectedPaymentMethod(root, selectedPaymentMethod, onQrDownloaded);
}

/**
 * Displays the details and actions for one payment method.
 */
function renderSelectedPaymentMethod(
  root: ShadowRoot,
  paymentMethod: PaymentMethod,
  onQrDownloaded: (paymentMethod: PaymentMethod) => void,
): void {
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

  configurePaymentActions(root, paymentMethod, onQrDownloaded);
}

/**
 * Connects the copy and download buttons to their utilities.
 */
function configurePaymentActions(
  root: ShadowRoot,
  paymentMethod: PaymentMethod,
  onQrDownloaded: (paymentMethod: PaymentMethod) => void,
): void {
  const copyButton = root.querySelector<HTMLButtonElement>('[data-copy-account-number]');
  const downloadButton = root.querySelector<HTMLButtonElement>('[data-download-qr]');
  const feedback = root.querySelector<HTMLElement>('[data-action-feedback]');

  if (copyButton && paymentMethod.accountNumber?.trim()) {
    copyButton.hidden = false;

    copyButton.addEventListener('click', () => {
      void handleAccountNumberCopy(copyButton, feedback, paymentMethod.accountNumber as string);
    });
  }

  downloadButton?.addEventListener('click', () => {
    void handleQrDownload(downloadButton, feedback, paymentMethod, onQrDownloaded);
  });
}

/**
 * Copies the selected account number and displays feedback.
 */
async function handleAccountNumberCopy(
  button: HTMLButtonElement,
  feedback: HTMLElement | null,
  accountNumber: string,
): Promise<void> {
  button.disabled = true;

  try {
    await copyTextToClipboard(accountNumber);

    showActionFeedback(feedback, 'Copied', false);
  } catch {
    showActionFeedback(feedback, 'The account number could not be copied.', true);
  } finally {
    button.disabled = false;
  }
}

/**
 * Downloads the selected QR and reports the result.
 */
async function handleQrDownload(
  button: HTMLButtonElement,
  feedback: HTMLElement | null,
  paymentMethod: PaymentMethod,
  onQrDownloaded: (paymentMethod: PaymentMethod) => void,
): Promise<void> {
  button.disabled = true;

  try {
    await downloadQrImage(paymentMethod.qrImageUrl, paymentMethod.provider);

    showActionFeedback(feedback, 'QR downloaded', false);
    onQrDownloaded(paymentMethod);
  } catch {
    showActionFeedback(feedback, 'The QR image could not be downloaded.', true);
  } finally {
    button.disabled = false;
  }
}

/**
 * Displays accessible success or error feedback.
 */
function showActionFeedback(feedback: HTMLElement | null, message: string, isError: boolean): void {
  if (!feedback) {
    return;
  }

  feedback.hidden = false;
  feedback.textContent = message;
  feedback.classList.toggle('error-message', isError);
  feedback.setAttribute('role', isError ? 'alert' : 'status');
}
