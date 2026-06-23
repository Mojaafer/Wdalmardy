import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next-intl': path.resolve(__dirname, './src/__mocks__/next-intl.ts'),
      'next/navigation': path.resolve(__dirname, './src/__mocks__/next-navigation.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
