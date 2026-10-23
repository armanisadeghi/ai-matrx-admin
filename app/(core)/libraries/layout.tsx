import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/libraries", {
  title: "Libraries",
  description:
    "Paste a YouTube channel and have every video cataloged in seconds — longs, Shorts and live separated, with metrics, transcripts and what to do next.",
  letter: "LB",
  additionalMetadata: {
    keywords: [
      "youtube channel",
      "video catalog",
      "shorts",
      "transcribe channel",
      "playlist",
      "media library",
    ],
  },
});

export default function LibrariesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
