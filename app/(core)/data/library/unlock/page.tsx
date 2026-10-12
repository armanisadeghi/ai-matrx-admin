// app/(core)/data/library/unlock/page.tsx — try the page unlocker on real blocked addresses, side by side with our scraper.

import { createRouteMetadata } from "@/utils/route-metadata";
import { UnlockPage } from "@/features/data-sources/unlock/UnlockPage";

export const metadata = createRouteMetadata("/data/library/unlock", {
  title: "Unlock a page",
  description: "Try a blocked page with our scraper and with the unlocker, side by side.",
  letter: "UP",
});

export default function UnlockRoutePage() {
  return <UnlockPage />;
}
