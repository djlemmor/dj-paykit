import type { ProviderId } from '../types/provider';

/**
 * Error produced when a QR image cannot be downloaded safely.
 */
export class QrDownloadError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'QrDownloadError';
  }
}

/**
 * Maps accepted image MIME types to safe filename extensions.
 */
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Downloads a QR image with a predictable, safe filename.
 */
export async function downloadQrImage(qrImageUrl: string, provider: ProviderId): Promise<void> {
  const normalizedUrl = qrImageUrl.trim();

  if (!normalizedUrl) {
    throw new QrDownloadError('The QR image URL is missing.');
  }

  let response: Response;

  try {
    response = await fetch(normalizedUrl, {
      method: 'GET',

      // Only requests image formats supported by the DJPayKit MVP.
      headers: {
        Accept: 'image/png,image/jpeg,image/webp',
      },

      // Includes same-origin cookies without sending them cross-origin.
      credentials: 'same-origin',
    });
  } catch {
    throw new QrDownloadError('Unable to connect to the QR image service.');
  }

  if (!response.ok) {
    throw new QrDownloadError(
      `The QR image could not be downloaded. The server returned HTTP ${response.status}.`,
    );
  }

  let imageBlob: Blob;

  try {
    imageBlob = await response.blob();
  } catch {
    throw new QrDownloadError('The QR image response could not be read.');
  }

  const mimeType = imageBlob.type.split(';')[0]?.trim().toLowerCase();

  const extension = mimeType ? IMAGE_EXTENSIONS[mimeType] : undefined;

  if (!extension) {
    throw new QrDownloadError('The server returned an unsupported QR image format.');
  }

  const objectUrl = URL.createObjectURL(imageBlob);
  const downloadLink = document.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = `djpaykit-${provider}-qr.${extension}`;
  downloadLink.style.display = 'none';

  document.body.append(downloadLink);

  try {
    // Starts the browser's normal file-download process.
    downloadLink.click();
  } finally {
    downloadLink.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
