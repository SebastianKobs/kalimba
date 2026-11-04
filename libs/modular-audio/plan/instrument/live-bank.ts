// ---------- plan/instrument/live-bank: a bank's patches as they play, edited as asked ----------
// As a synth's edit buffer holds its programs as you tweak them: each patch a live copy of its
// start (LiveCopies), edited or reset as messages on a bus ask (PresetMessage),
// each change told to whoever plays it.
import type { Preset } from '../planner/index.ts';
import { LiveCopies } from '../../../base/util/index.ts';
import { edited, type PresetMessage } from './preset.ts';

export class LiveBank extends LiveCopies<Preset> {
  // a value or a setting edited, or the patch reset to its start; for a patch it has
  edit(message: PresetMessage): void {
    if (message.type === 'preset reset') {
      this.reset(message.patch);
      return;
    }
    this.set(message.patch, edited(this.current(message.patch)!, message)); // a patch it has
  }
}
