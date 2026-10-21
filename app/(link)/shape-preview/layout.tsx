// app/(link)/shape-preview/layout.tsx — the providers the shape preview page needs.
//
// The `(link)` group deliberately ships NO providers (its layout says why); each route picks its own. A shape
// component renders through `DbKindComponent`, which reads the Redux store (the sandbox knob, the fix badge), so
// without a store the page threw "Cannot destructure property 'store' of … null" for the headless browser that
// screenshots and measures every saved shape (aidream `services/kind_preview`) — it never got past "loading".
import type { ReactNode } from "react";

import { LinkProviders } from "@/components/public-link/LinkProviders";

export default function Layout({ children }: { children: ReactNode }) {
  return <LinkProviders>{children}</LinkProviders>;
}
