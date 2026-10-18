// /spaces/use-template?template=<catalog id> — the in-app landing of "Use this template" on a Space template's
// public page (/templates/<slug>). A guest signs up first and comes back here; the template installs into the
// active organization and its first page opens.
import { Suspense } from "react";

import { UseTemplateFromWeb } from "@/features/spaces/templates/UseTemplateFromWeb";

export default function UseTemplateFromWebRoute() {
  return (
    <Suspense>
      <UseTemplateFromWeb />
    </Suspense>
  );
}
