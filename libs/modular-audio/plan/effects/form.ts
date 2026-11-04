// ---------- plan/effects/form: what every effect is ----------
// One input and one output, as an insert slot or a return holds it; its children free of roles.
import { frozen } from '../../../base/util/index.ts';
import type { Form } from '../planner/index.ts';

export const EFFECT_FORM: Form = frozen<Form>({ name: 'effect', inputs: ['in'], outputs: ['out'] });
