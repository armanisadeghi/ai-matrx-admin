import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/transcripts", {
  title: "Transcripts",
  description:
    "All your transcripts — browse, record, upload, and open in the workspace you want.",
  letter: "TR",
  additionalMetadata: {
    keywords: [
      "transcription",
      "speech to text",
      "audio transcription",
      "Whisper",
      "transcripts",
    ],
  },
});

export default function TranscriptsLayout({
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
