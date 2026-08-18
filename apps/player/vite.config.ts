import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// Alias workspace packages to their TypeScript source so Vite transpiles them
// directly (no build step for the packages during development).
const mindforgeAliases = {
  '@mindforge/schema': r('../../packages/schema/src/index.ts'),
  '@mindforge/audio': r('../../packages/audio/src/index.ts'),
  '@mindforge/engine': r('../../packages/engine/src/index.ts'),
  '@mindforge/style': r('../../packages/style/src/index.ts'),
  '@mindforge/characters': r('../../packages/characters/src/index.ts'),
  '@mindforge/motions': r('../../packages/motions/src/index.ts'),
  '@mindforge/effects': r('../../packages/effects/src/index.ts'),
  '@mindforge/cameras': r('../../packages/cameras/src/index.ts'),
  '@mindforge/environments': r('../../packages/environments/src/index.ts'),
  '@mindforge/library': r('../../packages/library/src/index.ts'),
  '@mindforge/themes': r('../../packages/themes/src/index.ts'),
  '@content': r('../../content'),
};

export default defineConfig({
  publicDir: r('../../public'),
  resolve: { alias: mindforgeAliases },
  server: {
    port: 5174,
    fs: { allow: [r('../../')] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
