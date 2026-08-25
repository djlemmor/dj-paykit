import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  /*
   * Generates TypeScript declaration files for developers using the package.
   */
  plugins: [
    dts({
      /*
       * Only source files belong in the public declaration package.
       * This prevents tests and configuration files from entering dist.
       */
      include: ['src'],

      /*
       * Removes the unnecessary "src" directory from declaration paths.
       *
       * Example:
       * dist/components/... instead of dist/src/components/...
       */
      entryRoot: 'src',

      /*
       * Creates dist/index.d.ts, matching the "types" path in package.json.
       */
      insertTypesEntry: true,
    }),
  ],

  build: {
    // Configures Vite to build a reusable library instead of a website.
    lib: {
      // This is the public entry point for DJPayKit.
      entry: 'src/index.ts',

      // This global name is used by the UMD browser build.
      name: 'DJPayKit',

      // ES modules support imports, while UMD supports script-based usage.
      formats: ['es', 'umd'],

      // Gives each generated build a predictable filename.
      fileName: (format) => (format === 'es' ? 'djpaykit.js' : 'djpaykit.umd.cjs'),
    },

    // Creates source maps to make distributed-code debugging easier.
    sourcemap: true,
  },
});
