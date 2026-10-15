// lib/coming-soon/announce.ts
//
// The app's announcer for the shared Coming-soon primitive (`@ai-matrx/kit/coming-soon`).
// Rides the existing global confirm host (single OK button) — no new overlay, no new singleton,
// no new dialog component. `window.alert` is banned; this is the sanctioned replacement for the
// "not built yet" case specifically.
//
// Importing this module sets the announcer; `app/Providers.tsx` imports it for that effect.
// Callers import `announceComingSoon` / `STAGE_LINE` from `@ai-matrx/kit/coming-soon`.

import { setComingSoonAnnouncer } from "@ai-matrx/kit/coming-soon";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";

export function installComingSoonAnnouncer(): void {
  setComingSoonAnnouncer(async (entry, stageLine) => {
    const description = [entry.promise, stageLine].filter(Boolean).join("\n\n");
    await confirm({
      title: `${entry.label} — coming soon`,
      description,
      confirmLabel: "Got it",
      cancelLabel: null, // acknowledge-only — nothing to cancel
    });
  });
}

installComingSoonAnnouncer();
