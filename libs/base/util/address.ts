// ---------- util/address: a path of names, as text, and one under another ----------
// Where something is, by its names on the way down: desk/channel 3/utility/level.
// Written with slashes; a name holds none.

// an address: the names on the way down, the last the thing's own
export type Address = readonly string[];

const SLASH = '/';

// An address as text: its names joined by slashes.
export function addressText(address: Address): string {
  for (const name of address) {
    refuseSlash(name);
  }
  return address.join(SLASH);
}
// An address from its text.
export function addressOf(text: string): Address {
  return text.split(SLASH);
}
// An address under a parent: the parent's name put in front, as a parent puts its child's.
export function under(name: string, address: Address): Address {
  refuseSlash(name);
  return [name, ...address];
}
// Whether an address, as text, is under another: a name further down, not the other itself.
// Every address but the top's is under the top's, the empty text.
export function isUnder(text: string, parent: string): boolean {
  if (parent === '') {
    return text !== '';
  }
  return text.startsWith(`${parent}${SLASH}`);
}
// a name with a slash refused: its address would read as two names
function refuseSlash(name: string): void {
  if (name.includes(SLASH)) {
    throw new Error(`a name holds a slash: ${name}`);
  }
}
