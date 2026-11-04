// ---------- util/from-data: data read from a file, its shape checked ----------
// Data read from a file, YAML's or JSON's, is unknown until it's checked.
// A shape says what it must be, written as data beside the type it becomes:
//   - 'word', 'number', 'switch' (true or false), 'word or number';
//   - { oneOf: words }: one of these words;
//   - { listOf: shape }: a list, each item of that shape;
//   - { anyOf: shapes }: a value of any one of these shapes;
//   - { byName: shape }: an object, each of its values of that shape, by name or by address;
//   - { fields, needs }: an object, each field it writes of its shape, and the fields it needs,
//     each a field or one of several;
//   - with `closed: true`, a field it doesn't name is refused too.
// A light check: what the shape says nothing of is left as it is.
// What the data means is its reader's check.
// Where it isn't of its shape, refused: every problem said, where it is, under the file's name.

// what data read from a file must be
export type Shape =
  | 'word'
  | 'number'
  | 'switch'
  | 'word or number'
  | { readonly oneOf: readonly string[] }
  | { readonly listOf: Shape }
  | { readonly anyOf: readonly Shape[] }
  | { readonly byName: Shape }
  | Fields;
// an object: its fields' shapes where it writes them; the fields it needs, each one or one of several
interface Fields {
  readonly fields?: Readonly<Record<string, Shape>>;
  readonly needs?: readonly (string | readonly string[])[];
  readonly closed?: true; // a field not named in fields is refused
}
// the file data was read from, and what it should have been, as a refusal says them
interface Read {
  readonly source: string;
  readonly what: string;
}

// what each kind of value is, as a refusal says what it isn't
const VALUES: Readonly<Record<string, { is: (value: unknown) => boolean; said: string }>> = {
  word: { is: (value) => typeof value === 'string', said: 'a word' },
  number: { is: (value) => typeof value === 'number', said: 'a number' },
  switch: { is: (value) => typeof value === 'boolean', said: 'true or false' },
  'word or number': {
    is: (value) => typeof value === 'string' || typeof value === 'number',
    said: 'a word or a number',
  },
};

// Data read from a file, as it is once it's of its shape; refused, every problem said, where it isn't.
export function fromData<Data>(data: unknown, shape: Shape, { source, what }: Read): Data {
  const problems = problemsIn(data, shape, '');
  if (problems.length) {
    throw new Error([`${source}: not of the shape of ${what}:`, ...problems].join('\n  '));
  }
  return data as Data; // of its shape, as checked
}

// What keeps an object or a map from its shape, each line after where it is (channels 2: ),
// none at the top.
function problemsIn(data: unknown, shape: Shape, at: string): string[] {
  if (!isObject(data)) {
    return [at ? `${at}: not an object` : `not an object: ${kindOf(data)}`];
  }
  if (typeof shape === 'object' && 'byName' in shape) {
    return Object.entries(data).flatMap(([name, value]) => entryProblems(value, shape.byName, at, name));
  }
  const fields = shape as Fields; // an object's shape, the only one left where data is an object
  const where = at ? `${at}: ` : '';
  const missing = (fields.needs ?? [])
    .map((need) => (typeof need === 'string' ? [need] : need))
    .filter((names) => names.every((name) => data[name] === undefined))
    .map((names) => `${where}no ${names.join(' or ')}`);
  const written = Object.entries(fields.fields ?? {}).filter(([name]) => data[name] !== undefined);
  const wrong = written.flatMap(([name, field]) => fieldProblems(data[name], field, at, name));
  return [...missing, ...wrong, ...unnamedProblems(data, fields, where)];
}
// Closed: each field the data writes that the shape doesn't name, after the wrong ones.
function unnamedProblems(data: Record<string, unknown>, fields: Fields, where: string): string[] {
  if (!fields.closed) {
    return [];
  }
  const named = new Set(Object.keys(fields.fields ?? {}));
  return Object.keys(data)
    .filter((name) => data[name] !== undefined && !named.has(name))
    .map((name) => `${where}its ${name} not one of its fields`);
}
// What keeps an entry, a list's item or a map's, from its shape, by its name there (inserts 2):
// an object or a map said where it is, as one of its own; a value said as a field's.
function entryProblems(value: unknown, shape: Shape, at: string, name: string): string[] {
  if (isContainer(shape)) {
    return problemsIn(value, shape, under(at, name));
  }
  return fieldProblems(value, shape, at, name);
}
// What keeps a field's value from its shape, said as the field's (its pan not true or false).
// A list's items, or a map's entries, each said by its place in it (inserts 2, taps reverb).
function fieldProblems(value: unknown, shape: Shape, at: string, name: string): string[] {
  const its = `${at ? `${at}: ` : ''}its ${name}`;
  if (typeof shape === 'string') {
    const { is, said } = VALUES[shape]!; // every word a Shape is has its value
    return is(value) ? [] : [`${its} not ${said}`];
  }
  if ('oneOf' in shape) {
    return shape.oneOf.includes(value as string) ? [] : [`${its} ${shown(value)}, not ${listed(shape.oneOf)}`];
  }
  if ('anyOf' in shape) {
    const fits = shape.anyOf.some((alternative) => fieldProblems(value, alternative, at, name).length === 0);
    return fits ? [] : [`${its} not ${saidOf(shape)}`];
  }
  if ('listOf' in shape) {
    if (!Array.isArray(value)) {
      return [`${its} not a list`];
    }
    return value.flatMap((item: unknown, index) => entryProblems(item, shape.listOf, at, `${name} ${index + 1}`));
  }
  return objectProblems(value, shape, at, name);
}
// What keeps a field's value from an object's or a map's shape
function objectProblems(value: unknown, shape: Shape, at: string, name: string): string[] {
  if (!isObject(value)) {
    return [`${at ? `${at}: ` : ''}its ${name} not an object`];
  }
  if (typeof shape === 'object' && 'byName' in shape) {
    return Object.entries(value).flatMap(([key, entry]) => entryProblems(entry, shape.byName, at, `${name} ${key}`));
  }
  return problemsIn(value, shape, under(at, name));
}
// a place under another, as a refusal says it: channels 2 inserts 1
function under(at: string, place: string): string {
  return at ? `${at} ${place}` : place;
}
// whether a shape is an object's or a map's, whose problems say where they are
function isContainer(shape: Shape): boolean {
  return typeof shape === 'object' && !('oneOf' in shape) && !('listOf' in shape) && !('anyOf' in shape);
}
// what a shape is, as a refusal says it isn't: a word, a list, an object, or each of an anyOf's alternatives
function saidOf(shape: Shape): string {
  if (typeof shape === 'string') {
    return VALUES[shape]!.said; // every word a Shape is has its value
  }
  if ('oneOf' in shape) {
    return listed(shape.oneOf);
  }
  if ('listOf' in shape) {
    return 'a list';
  }
  if ('anyOf' in shape) {
    const said = shape.anyOf.map(saidOf);
    return said.length < 2 ? said.join('') : `${said.slice(0, -1).join(', ')}, or ${said.at(-1)}`;
  }
  return 'an object';
}
// an object, not a list
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
// what data is where it isn't an object: none, or a value of its type
function kindOf(data: unknown): string {
  return data === null || data === undefined ? 'none' : `a ${typeof data}`;
}
// a value as data wrote it, in a problem's line: a word as it is, anything else as JSON
function shown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value) ?? 'none';
}
// words as a list says them: a, b or c
function listed(words: readonly string[]): string {
  if (words.length < 2) {
    return words.join('');
  }
  return `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;
}
