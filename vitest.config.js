import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM — derive it from import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for LaunchPard.
 *
 * Run tests:        npx vitest run
 * Watch mode:       npx vitest
 * Coverage report:  npx vitest run --coverage
 *
 * The `@/` alias maps to `./src/` to match Next.js jsconfig paths.
 * Tests live in `src/**/__tests__/*.test.js`.
 */
export default defineConfig({
  test: {
    // Run in Node environment — these are server-side lib tests.
    environment: 'node',
    // Include coverage for the revenue-critical lib files.
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/tierAccess.js',
        'src/lib/taraClassifier.js',
        'src/lib/markingEngine.js',
        'src/lib/security/webhook.js',
        'src/lib/security/cronAuth.js',
      ],
      thresholds: {
        // Minimum coverage thresholds — raise as test suite grows.
        lines: 60,
        functions: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
