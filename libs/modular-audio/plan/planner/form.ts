// ---------- plan/planner/form: the constraints a template has to fulfil, as data ----------
// A kind's rules, a channel's, a desk's or an effect's, declared, not built into code:
//   - its own inputs and outputs, by name, where it names them;
//   - its children by role: each role's kind or form, how many, at least and at most;
//   - in the roles' order, where the form says;
//   - the wires it allows: from a role's output, its main one or a tap, or the parent's own
//     input; into a role's input or param, or the parent's own output;
//   - rules by name: no loops, but through the wires from one role into another it names;
//     every way out ending in one role (the master).
// A template names the form it fulfils, and is held to it as it's handed in (check.ts).

// a role a child plays in its parent: its kind or the form it fulfils, how many there are
export interface FormRole {
  readonly role: string;
  readonly kind?: string;
  readonly form?: string;
  readonly least?: number;
  readonly most?: number;
}
// where a wire a form allows comes from: a role's output, its main one or any other, a tap; or the parent's own input
export type FormFrom = { readonly role: string; readonly output: 'out' | 'tap' } | { readonly parent: 'in' };
// where it goes: a role's input, or its param; or the parent's own output
export type FormTo = { readonly role: string; readonly param?: boolean } | { readonly parent: 'out' };
// a wire a form allows
export interface FormWire {
  readonly from: FormFrom;
  readonly to: FormTo;
}
// a rule by name:
//   - no loops between its children, but through the wires from a role into a role, where it says:
//     a desk's sends between returns, each delayed, as a loop needs;
//   - every child's way out, by its main outputs, ending in a role.
export type FormRule =
  | { readonly rule: 'no loops'; readonly but?: { readonly from: string; readonly to: string } }
  | { readonly rule: 'ends in'; readonly role: string };
// A form, by its name:
//   - its jacks, any where it names none;
//   - its roles, in order where it says; children free of roles where it names none;
//   - the wires it allows, any where it lists none; its rules.
export interface Form {
  readonly name: string;
  readonly inputs?: readonly string[];
  readonly outputs?: readonly string[];
  readonly ordered?: boolean;
  readonly roles?: readonly FormRole[];
  readonly wires?: readonly FormWire[];
  readonly rules?: readonly FormRule[];
}
