// ---------- clip-player/messages: what's asked of a clip in its slot ----------
// As a session view's clip asks:
//   - clip launched: its slot's clip played on its track;
//   - clip deleted: its slot's clip gone, its owner's to say what goes with it.
// Slot: what the slot's owner knows it by.
export type ClipMessage<Slot> =
  { readonly type: 'clip launched'; readonly slot: Slot } | { readonly type: 'clip deleted'; readonly slot: Slot };
