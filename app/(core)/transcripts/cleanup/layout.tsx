import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/transcripts", {
  titlePrefix: "Cleanup",
  title: "Transcripts",
  description:
    "High-volume transcription cleanup — raw capture, AI cleanup runs, and custom output.",
  letter: "CL",
});

export default function TranscriptsCleanupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
