/**
 * What a person typed into the server-rendered form before React took it over. A controlled input
 * hydrates to its state value and silently drops those keystrokes (re-walk: a title typed right after
 * load was wiped, in dev where hydration lands late). The form merges them in once, after mount: a
 * typed field wins over an empty default, never over a value. Pure.
 */
export function mergeTyped<T extends object>(form: T, typed: Partial<Record<keyof T, string | undefined>>): T {
  let next = form;
  for (const [k, v] of Object.entries(typed) as Array<[keyof T, string | undefined]>) {
    if (typeof v === "string" && v.length > 0 && ((form[k] as unknown) === "" || form[k] == null)) {
      next = { ...next, [k]: v };
    }
  }
  return next;
}
