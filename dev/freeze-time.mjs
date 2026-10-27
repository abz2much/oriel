/* Import this first: freezes Date in Node at 27 Oct 2026 08:12, so mock states built from "now" are the same on every run. */
const FIXED = new Date(2026, 9, 27, 8, 12, 0).getTime(), RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } };
