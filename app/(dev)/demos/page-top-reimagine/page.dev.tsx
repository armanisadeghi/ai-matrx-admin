// /demos/page-top-reimagine — UI bake-off (ui-reimagine): the docking page top on your real brands.
import { Suspense } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { PageTopReimagineDemo } from "./PageTopReimagineDemo";

export const metadata = { title: "Page top — reimagine" };

export default function PageTopReimaginePage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<RegionSkeleton shape="rows" count={8} aria-label="Loading the page top" />}>
        <PageTopReimagineDemo />
      </Suspense>
    </div>
  );
}
