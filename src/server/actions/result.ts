/** Shared return shape for Server Actions that report success/failure inline. */
export type ActionResult = { ok: true } | { ok: false; error: string };
