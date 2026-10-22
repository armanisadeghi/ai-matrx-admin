// Open Graph image for a published org chart. Reuses the shared branded OG renderer so every
// AI Matrx share reads as one system.
import { eduOgContentType, eduOgSize, renderEduOgImage } from "@/features/education/publishing/ogImage";
import { readPublishedOrgChart } from "@/features/agents/org-chart/publish/publicRead";
import { countBoxes } from "@/features/agents/org-chart/publish/snapshot";

export const size = eduOgSize;
export const contentType = eduOgContentType;
export const alt = "Org chart made with AI Matrx";

export default async function OrgChartOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chart = await readPublishedOrgChart(slug).catch(() => null);
  if (!chart) {
    return renderEduOgImage({ eyebrow: "Org chart", title: "AI Matrx", description: "Org charts of people and AI agents.", letter: "Oc" });
  }
  return renderEduOgImage({
    eyebrow: `Org chart · ${countBoxes(chart.snapshot)} boxes`,
    title: chart.title,
    description: chart.blurb ?? "People and AI agents, and who works with whom.",
    letter: chart.title.slice(0, 2).toUpperCase(),
  });
}
