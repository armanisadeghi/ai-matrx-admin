// The light header's theme switch, loaded on click. Writes the SAME record the sync engine's
// themePolicy writes (key, version, this device's identity), paints <html> the way its pre-paint
// does, and mirrors the server cookie — so the choice holds on the next page, light or full.

import { deriveIdentity } from "@/lib/sync/identity";
import { localStorageAdapter } from "@/lib/sync/persistence/local-storage";
import { themePolicy, writeThemeCookie, type ResolvedThemeMode } from "@/styles/themes/themeSlice";

export function writePublicThemeChoice(mode: ResolvedThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.setAttribute("data-theme", mode);
  localStorageAdapter.write(themePolicy.storageKey, {
    version: themePolicy.config.version,
    identityKey: deriveIdentity().key,
    body: { mode },
  });
  writeThemeCookie(mode);
}
