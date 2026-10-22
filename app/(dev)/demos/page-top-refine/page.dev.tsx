// /demos/page-top-refine — the page top (path row, tabs row, intro band, summary band), refined.
// Bake-off posture: ui-refine. Reference: GitHub (Primer UnderlineNav + repository header) for the
// tabs row and the intro band, Vercel's dashboard top bar for the path row's level switchers.
// Wired to real brands (web.brand via the /marketing/brands/all service) and the frame's real crumbs.
import { createRouteMetadata } from "@/utils/route-metadata";
import { PageTopRefineDemo } from "./PageTopRefineDemo";

export const metadata = createRouteMetadata("/demos/page-top-refine", {
  title: "Page top (refine)",
  description: "The page top refined: path row, sticky tabs, intro and summary bands.",
});

export default function PageTopRefinePage() {
  return <PageTopRefineDemo />;
}
