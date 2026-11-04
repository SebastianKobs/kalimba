// ---------- plan/effects: what every effect is, its form ----------
// One input and one output, its form (form.ts).
// The effects themselves, a template each read from YAML, are its content (content.ts),
// imported apart, so code needing the form alone loads no YAML.
export { EFFECT_FORM } from './form.ts';
