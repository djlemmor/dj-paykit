/**
 * Error produced when text cannot be copied.
 */
export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'ClipboardError';
  }
}

/**
 * Copies text using the modern Clipboard API when available.
 *
 * A hidden textarea is used as a fallback for older browsers or when
 * Clipboard API access is unavailable.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new ClipboardError('There is no account number to copy.');
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(normalizedText);

      return;
    } catch {
      /*
       * Clipboard access can fail because of browser permissions.
       * Continue to the older textarea-based method when that happens.
       */
    }
  }

  fallbackCopyText(normalizedText);
}

/**
 * Copies text through a temporary textarea.
 */
function fallbackCopyText(text: string): void {
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');

  /*
   * Keeps the textarea available to the browser's selection system
   * without displaying it to the customer.
   */
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';

  document.body.append(textarea);

  try {
    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');

    if (!copied) {
      throw new ClipboardError('The account number could not be copied.');
    }
  } finally {
    textarea.remove();
  }
}
