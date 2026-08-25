import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /*
     * jsdom simulates browser features such as document, customElements,
     * HTMLElement, and Shadow DOM while running tests in Node.js.
     */
    environment: 'jsdom',

    // Automatically resets mock call information between tests.
    clearMocks: true,

    // Restores mocked functions to their original implementation after tests.
    restoreMocks: true,
  },
});
