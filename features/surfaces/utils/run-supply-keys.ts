/**
 * Splits the run-supply rollup's keys (`ui.mv_surface_run_supply.supplied_keys`) into this
 * surface's own values and values that came from OTHER open screens.
 *
 * Why the rollup carries both: a run's context receipt lists every context object the agent
 * got. The server (aidream `surface_context.py _apply_open_surroundings`) expands the live
 * surface chain — every other mounted registered surface, window, page or parent — into objects
 * keyed `<surface>::<value>`, and each unregistered open window into `window::<title>`.
 * A plain key is the run's own surface. A `<surface>::<value>` key whose surface is on this
 * surface's chain is an inherited value of this page; any other qualified key is a screen that
 * happened to be open beside it.
 */

export interface OwnSuppliedKey {
  /** The value name (qualifier stripped). */
  name: string;
  /** The chain level that supplied it under a qualified key; null for a plain key. */
  via: string | null;
}

export interface OtherScreenKey {
  /** The other surface's name, or null for an unregistered window. */
  surface: string | null;
  /** The value name, or the window's title for an unregistered window. */
  name: string;
}

export function splitRunSupplyKeys(
  keys: string[],
  chainNames: string[],
): { own: OwnSuppliedKey[]; others: OtherScreenKey[] } {
  const chain = new Set(chainNames);
  const own: OwnSuppliedKey[] = [];
  const others: OtherScreenKey[] = [];
  const seenOwn = new Set<string>();
  for (const key of keys) {
    const at = key.indexOf("::");
    if (at < 0) {
      if (!seenOwn.has(key)) {
        seenOwn.add(key);
        own.push({ name: key, via: null });
      }
      continue;
    }
    const qualifier = key.slice(0, at);
    const name = key.slice(at + 2);
    if (!name) continue;
    if (qualifier === "window") others.push({ surface: null, name });
    else if (chain.has(qualifier)) {
      if (!seenOwn.has(name)) {
        seenOwn.add(name);
        own.push({ name, via: qualifier });
      }
    } else others.push({ surface: qualifier, name });
  }
  return { own, others };
}
