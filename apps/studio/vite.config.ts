import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

const mindforgeAliases = {
  '@mindforge/schema': r('../../packages/schema/src/index.ts'),
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
  plugins: [react()],
  resolve: { alias: mindforgeAliases },
  server: {
    port: 5173,
    fs: { allow: [r('../../')] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
