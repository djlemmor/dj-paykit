import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from '../../src/utils/clipboard';
import { downloadQrImage } from '../../src/utils/qr-download';

describe('payment actions', () => {
  afterEach(() => {
    // Restores browser APIs modified by the tests.
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    document.body.innerHTML = '';
  });

  it('copies an account number using the Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    await copyTextToClipboard(' 0912 345 6789 ');

    // Leading and trailing spaces should not be copied.
    expect(writeText).toHaveBeenCalledWith('0912 345 6789');
  });

  it('uses the textarea fallback when Clipboard API is unavailable', async () => {
    const originalExecCommand = document.execCommand;
    const execCommand = vi.fn().mockReturnValue(true);

    vi.stubGlobal('navigator', {});

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    try {
      await copyTextToClipboard('0999 111 2222');

      expect(execCommand).toHaveBeenCalledWith('copy');

      // The temporary textarea must be removed after copying.
      expect(document.querySelector('textarea')).toBeNull();
    } finally {
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: originalExecCommand,
      });
    }
  });

  it('downloads a QR image with a safe filename', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:djpaykit-qr');
    const revokeObjectURL = vi.fn();

    const response = {
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(
        new Blob(['qr-image'], {
          type: 'image/png',
        }),
      ),
    } as unknown as Response;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      // Prevents jsdom from attempting browser navigation.
    });

    await downloadQrImage('/api/djpaykit/payment-methods/pm_01/qr', 'gcash');

    const clickedLink = clickSpy.mock.instances[0] as HTMLAnchorElement;

    expect(clickedLink.download).toBe('djpaykit-gcash-qr.png');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:djpaykit-qr');
  });
});
