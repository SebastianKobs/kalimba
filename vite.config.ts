import { defineConfig } from 'vitest/config';
// a .yaml file imported as its data: stim-garden's loader, copied with its libraries (tools/update-libs.sh)
import { yamlPlugin } from './tools/yaml.js';

export default defineConfig({
  // where the page is served from: / by default (the dev server, the Docker image), /kalimba/ on GitHub Pages (.github/workflows/pages.yml)
  base: process.env.BASE_PATH ?? '/',
  plugins: [yamlPlugin()],
  test: {
    globals: true,
    // the copied libraries' tests run on node's own runner: npm run test:libs
    include: ['test/**/*.test.ts'],
  },
});
