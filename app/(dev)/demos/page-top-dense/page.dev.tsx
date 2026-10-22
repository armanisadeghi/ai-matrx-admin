// /demos/page-top-dense — the ui-dense bake-off entry for the app's page top (path row, tabs row,
// intro band, figures band), on the signed-in person's real brands.
import { Suspense } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { createRouteMetadata } from "@/utils/route-metadata";
import { PageTopDenseDemo } from "./PageTopDenseDemo";

export const metadata = createRouteMetadata("/demos/page-top-dense", {
  title: "Page Top — Dense",
  description: "Dense page-top bake-off entry: path row, tabs, intro and figures bands on real brands.",
});

export default function PageTopDensePage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<RegionSkeleton shape="rows" count={6} />}>
        <PageTopDenseDemo />
      </Suspense>
    </div>
  );
}
