import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server/**',
      '**/src/__checks__/**', // Checkly browser checks use a separate Playwright runner.
      '**/.{idea,git,cache,output,temp}/**'
    ],
  },
});
