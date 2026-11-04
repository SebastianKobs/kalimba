// ---------- build/contract/builder: what every builder is ----------
// Handed a plan, where its sound goes and where each of its inputs comes from, it builds the plan and
// hands back what's built. Where a sound goes or comes from is each builder's own: for Web Audio a node.
import type { Plan } from '../../plan/format/index.ts';
import type { Built } from './built.ts';

// a builder, its sound going into what its system takes, its inputs fed from it, by name
export interface Builder<Into> {
  build(plan: Plan, where: { readonly into: Into; readonly from?: Readonly<Record<string, Into>> }): Built;
}
