"use client";

/**
 * Univer's drawing UI names `AddImageIcon` on its Insert-image menu items but
 * never registers it (upstream gap), so the icon manager logs "Icon AddImageIcon
 * does not exist" on every editor load. Register it ourselves, right after
 * `createUniver`, so the toolbar draws a real icon and the console stays clean.
 */

import { IconManager } from "@univerjs/ui";
import { AddImageIcon } from "@univerjs/icons";

type InjectorLike = { get(id: unknown): unknown };

/** Icons Univer's own plugins reference but do not register. */
export const MISSING_UNIVER_ICONS = { AddImageIcon } as const;

export function registerMissingUniverIcons(injector: InjectorLike): void {
  const icons = injector.get(IconManager) as {
    register(icons: Record<string, unknown>): unknown;
  };
  icons.register({ ...MISSING_UNIVER_ICONS });
}
