import { settingAt } from '../../libs/modular-audio/plan/format/index.ts';
import { roomPlan, ROOM_SECONDS } from '../../src/sound/room';

describe('roomPlan', () => {
  it('is the library’s Reverb, a small room of 1.5 s', () => {
    const plan = roomPlan();
    expect(plan.node.kind).toBe('Reverb');
    expect(ROOM_SECONDS).toBe(1.5);
    expect(settingAt(plan, ['room', 'length'])?.value).toBe(1.5);
  });
});
