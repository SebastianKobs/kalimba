// ---------- plan/format/address: values by their addresses in a plan ----------
// An address is a path of names from the plan's top, as a parent puts its child's name in front:
// desk/channel 3/utility/level (libs/base/util's Address, addressText(), addressOf()).
// The plan's top node isn't named: what was asked for, every address starts under it.

// values by their addresses as text: a number, or one of its choices; a preset's, a template's child's
export type ValuesByAddress = Readonly<Record<string, number | string>>;
