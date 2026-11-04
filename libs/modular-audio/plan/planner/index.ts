// ---------- plan/planner: templates made into plans ----------
// A plan for whatever is asked, once, before anything plays; used by whoever plans,
// an editor among them, never by a builder or a view.
// Its parts:
//   - template.ts: a composite's description, written short, and a preset on one, either read
//     from data, its shape checked (libs/base/util/'s fromData()); extend.ts, a template built on
//     another, merged; presets.ts, a child written with a preset;
//   - planner.ts: the planner, handed the templates once, a plan for any of them;
//   - check.ts: a template checked well-formed as it's handed in, then held to its form, every failure said;
//   - form.ts: the constraints a template has to fulfil, as data; form-check.ts, a template held to its form;
//   - catalog.ts: every kind the planner knows, blocks and templates, as seen from outside;
//   - mono-stereo.ts: whether a jack carries mono or stereo, as it comes, where its block doesn't fix it.
export { Planner, type Asked } from './planner.ts';
export {
  presetsOf,
  presetsShape,
  templateOf,
  type Preset,
  type PresetChild,
  type Template,
  type TemplateChild,
  type TemplateMacro,
  type TemplatePool,
  type WrittenTemplate,
} from './template.ts';
export type { Form, FormFrom, FormRole, FormRule, FormTo, FormWire } from './form.ts';
