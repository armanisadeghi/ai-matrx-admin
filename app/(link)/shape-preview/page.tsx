// record-view: none — a render surface for the screenshot browser, addressed by a signed link
// app/(link)/shape-preview/page.tsx — ONE shape component, rendered for the headless browser that
// screenshots it for the agent that wrote it (aidream `kindcomp_preview`). The signed `t` link is the
// whole credential; nothing here needs a session. Body: features/content-ir/studio/preview.

import { Suspense } from "react";
import ShapePreviewClient from "@/features/content-ir/studio/preview/ShapePreviewClient";

export const metadata = { title: "Shape preview", robots: { index: false, follow: false } };

export default function ShapePreviewPage() {
  return (
    <Suspense fallback={null}>
      <ShapePreviewClient />
    </Suspense>
  );
}
