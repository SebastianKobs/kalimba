// ---------- plan/format/wire: a wire inside a node, by names ----------
// From an output into an input, or into a param (modulation), within one inside.
// A child named by its node; the parent's own input or output by its name alone.

// where a wire comes from: a child's output, or the parent's own input
export type WireFrom = { readonly node: string; readonly output: string } | { readonly input: string };
// where a wire goes: a child's input, a child's param, or the parent's own output
export type WireTo =
  | { readonly node: string; readonly input: string }
  | { readonly node: string; readonly param: string }
  | { readonly output: string };
// a wire: from where, to where
export interface Wire {
  readonly from: WireFrom;
  readonly to: WireTo;
}

// A wire's end with a node's name renamed (a pool's name its copy's address); any other end as it is.
export function renamedEnd<End extends WireFrom | WireTo>(end: End, from: string, to: string): End {
  if (!('node' in end) || end.node !== from) {
    return end;
  }
  return { ...end, node: to };
}
