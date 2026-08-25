import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  // Generates TypeScript declaration files for developers using the package.
  plugins: [
    dts({
      // Creates the main type declaration entry in the dist directory.
      insertTypesEntry: true,
    }),
  ],

  build: {
    // Configures Vite to build a reusable library instead of a website.
    lib: {
      // This will be the public entry point for DJPayKit.
      entry: 'src/index.ts',

      // This global name is used by the UMD browser build.
      name: 'DJPayKit',

      // ES modules support modern browsers and UMD supports script-based usage.
      formats: ['es', 'umd'],

      // Gives each generated build a predictable filename.
      fileName: (format) => (format === 'es' ? 'djpaykit.js' : 'djpaykit.umd.cjs'),
    },

    // Creates source maps to make debugging the distributed package easier.
    sourcemap: true,
  },
});
