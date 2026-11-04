// ---------- plan/instrument/instrument: an instrument, a pool of voices ----------
// Only ever planned: what's built makes, releases and lets go of its voices as notes come.
// An instrument of one patch: a pool of voices, each a copy of its voice card, the patch's
// preset on its architecture.
// A drum rack: a pool for each pad, each its own patch, played by its key.
// Each pool's note: the note's sources by name, each into the voice card's macro of that name.
import type { NoteAddresses } from '../format/index.ts';
import type { Preset, Template, TemplatePool, WrittenTemplate } from '../planner/index.ts';
import { INSTRUMENT_FORM } from './architecture-form.ts';
import { NOTE_SOURCES } from './note.ts';

// A rack's chain: a patch, a preset on its architecture; the key it answers, a drum rack's
// pad's, none every key.
export interface Chain {
  readonly patch: Preset;
  readonly key?: number;
}

// the role every voice plays in its instrument
const VOICE = 'voice';

// An instrument's template, of its chains: one with no key, an instrument of one patch; each
// with its key, a drum rack. Its architectures handed in, as the planner will be.
export function instrumentOf(
  kind: string,
  chains: readonly Chain[],
  architectures: readonly WrittenTemplate[],
): Template {
  refusedKeys(kind, chains);
  return {
    kind,
    form: INSTRUMENT_FORM.name,
    outputs: [{ name: 'out', channels: 1 }], // mono, as its voices are
    pools: chains.map((chain) => poolOf(kind, chain, architectures)),
  };
}

// a rack's chains each its key, none twice; one chain alone answering every key
function refusedKeys(kind: string, chains: readonly Chain[]): void {
  const keys = chains.flatMap(({ key }) => (key === undefined ? [] : [key]));
  if (chains.length > 1 && keys.length < chains.length) {
    throw new Error(`${kind}: a rack's chains each its key`);
  }
  const twice = keys.find((key, index) => keys.indexOf(key) !== index);
  if (twice !== undefined) {
    throw new Error(`${kind}: key ${twice} twice`);
  }
}
// A chain's pool: its voice card, the patch's preset on its architecture, named a voice or by
// its pad; each copy into the instrument's output; the note's addresses; its key.
function poolOf(kind: string, { patch, key }: Chain, architectures: readonly WrittenTemplate[]): TemplatePool {
  const architecture = architectures.find((each) => each.kind === patch.kind);
  if (!architecture) {
    throw new Error(`${kind}: no architecture ${patch.kind}`);
  }
  const name = key === undefined ? VOICE : `pad ${key}`;
  return {
    child: {
      name,
      kind: patch.kind,
      role: VOICE,
      ...(patch.values && { values: patch.values }),
      ...(patch.settings && { settings: patch.settings }),
    },
    wires: [{ from: { node: name, output: 'out' }, to: { output: 'out' } }],
    note: noteOf(architecture),
    ...(key !== undefined && { key }),
  };
}
// the note's sources, each into the voice card's macro of its name, where it has one
function noteOf(architecture: WrittenTemplate): NoteAddresses {
  const names = (architecture.macros ?? []).map(({ name }) => name).filter((name) => Object.hasOwn(NOTE_SOURCES, name));
  return Object.fromEntries(names.map((name) => [name, [[name]]]));
}
