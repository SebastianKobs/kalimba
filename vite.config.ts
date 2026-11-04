import { defineConfig } from 'vitest/config';
// a .yaml file imported as its data: stim-garden's loader, copied with its libraries (tools/update-libs.sh)
import { yamlPlugin } from './tools/yaml.js';

export default defineConfig({
  plugins: [yamlPlugin()],
  test: {
    globals: true,
    // the copied libraries' tests run on node's own runner: npm run test:libs
    include: ['test/**/*.test.ts'],
  },
});
