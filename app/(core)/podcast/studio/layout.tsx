import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/podcast", {
  titlePrefix: "Studio",
  title: "Podcasts",
  description: "Create and manage AI-produced podcast episodes.",
  letter: "PS",
});

export default function PodcastStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
