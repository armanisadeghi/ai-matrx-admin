"use client";

// lib/coming-soon/ComingSoonClient.tsx
//
// THE client-side entry for the Coming-soon primitive. `app/Providers.tsx` is a Server Component, so a
// side-effect import there registers only on the server; the browser never saw the registry and every
// Citations / Preferences / Notification-settings row failed closed. This "use client" module is what
// puts the registry and the announcer into the BROWSER bundle. Mount `<ComingSoonClient />` once in every
// provider tree, beside `<ConfirmDialogHost />` (the announcer rides that host).

import "./registry";
import "./announce";

export function ComingSoonClient(): null {
  return null;
}
