import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/voice", {
  title: "Voice",
  description:
    "Browse, preview, and tune production TTS voices for chat, assistants, transcripts, and podcasts.",
  letter: "V",
  additionalMetadata: {
    keywords: [
      "text to speech",
      "TTS",
      "voice synthesis",
      "Cartesia",
      "voice playground",
      "AI voice",
    ],
  },
});

export default function VoiceManagerLayout({
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
