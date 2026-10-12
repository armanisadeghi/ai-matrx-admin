// app/(core)/data/library/lab/page.tsx — Data to model: fetched records, the two ways a model can get
// them (handed over in the first message, or fetched through the site_data tool), and a run of both.
// The page is features/data-sources/lab/DataToModelLab.tsx.

import { createRouteMetadata } from "@/utils/route-metadata";
import { DataToModelLab } from "@/features/data-sources/lab/DataToModelLab";

export const metadata = createRouteMetadata("/data/library/lab", {
  title: "Data to model",
  description: "See fetched records, what a model receives, and what it costs.",
  letter: "DM",
});

export default function DataToModelLabPage() {
  return <DataToModelLab />;
}
