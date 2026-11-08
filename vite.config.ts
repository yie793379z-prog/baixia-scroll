import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// The local launcher checks the running folder before opening an existing server.
const projectRoot = realpathSync(fileURLToPath(new URL('.', import.meta.url)));
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const projectIdentity: Plugin = {
  name: 'baixia-local-project',
  configureServer(server) {
    server.middlewares.use('/__baixia__/project.json', (_request, response) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({ name: 'baixia-scroll', version, root: projectRoot, imageId: 'fengning_1794' }));
    });
  },
};
export default defineConfig({
  plugins: [react(), projectIdentity],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { strict: true, deny: ['**/*.tif','**/*.tiff','**/.env*','**/data/p1-protected-baseline.json'] } },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', rollupOptions:{input:['index.html','asset-review.html']} },
  // Inline React and Three for render/geometry regressions: the literal %-encoded checkout path
  // otherwise gets decoded again by Node's external ESM loader.
  test: { environment: 'node', include: ['tests/**/*.test.ts'], server: { deps: { inline: [/\/react(?:-dom)?\//, /\/three\//] } } },
});
