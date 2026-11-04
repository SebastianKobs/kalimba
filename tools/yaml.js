// ---------- YAML read as data: a file a module, its data its default export ----------
// What people write is YAML, its comments the reasons; what runs is its data, as JSON has it.
// Read so by:
//   1. the app's build, dev server and demo alike: Vite's plugin (yamlPlugin(), vite.config.js);
//   2. the tests in node: its module hooks (yaml-hooks.js, which make test-unit registers).
import { parse } from 'yaml';

// A YAML file's text as a module's source, its data its default export.
// One that isn't YAML refused, naming its file: a list not closed, a key written twice.
export function yamlModule(text, file) {
  try {
    return `export default ${JSON.stringify(parse(text))};\n`;
  } catch (error) {
    throw new Error(`${file}: ${error.message}`, { cause: error });
  }
}
// Vite's plugin: a .yaml file's module; any other file left to Vite
export function yamlPlugin() {
  return {
    name: 'yaml',
    transform(text, id) {
      if (!id.endsWith('.yaml')) {
        return null;
      }
      return { code: yamlModule(text, id), map: null };
    },
  };
}
