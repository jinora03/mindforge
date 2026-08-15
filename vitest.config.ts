import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@mindforge/schema': pkg('schema'),
      '@mindforge/engine': pkg('engine'),
      '@mindforge/style': pkg('style'),
      '@mindforge/characters': pkg('characters'),
      '@mindforge/motions': pkg('motions'),
      '@mindforge/effects': pkg('effects'),
      '@mindforge/cameras': pkg('cameras'),
      '@mindforge/environments': pkg('environments'),
      '@mindforge/library': pkg('library'),
      '@mindforge/themes': pkg('themes'),
    },
  },
});
