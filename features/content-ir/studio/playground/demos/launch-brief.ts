import type { PlaygroundDemo } from "../types";

/** Props, streaming fill, header copy bar + export, panels in a grid, markdown. */
const source = String.raw`import { FileText, Target, Users, CalendarClock } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import MarkdownStream from "@/components/MarkdownStream";

const ICONS = { goal: Target, audience: Users, timeline: CalendarClock };

function sectionText(section) {
  return "## " + streamText(section?.title, "Section") + "\n\n" + streamText(section?.body, "");
}

export default function LaunchBrief({ data, runAction }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const sections = streamList(data?.sections);
  const summary = streamText(data?.summary, "");
  const allText = () =>
    "# " + title + "\n\n" + summary + "\n\n" + sections.map(sectionText).join("\n\n");

  if (!arrived && sections.length === 0) {
    return <StreamingSkeleton layout="cards" rows={4} />;
  }

  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={title || "Launch brief"}
        icon={FileText}
        subtitle={streamText(data?.product, "")}
        stats={[{ label: "sections", value: sections.length }]}
        copy={{
          label: "Launch brief",
          human: allText,
          json: () => data,
          agent: () => ({
            kind: "launch_brief",
            location: "Shape playground",
            description: "A product launch brief",
            data,
            summary,
          }),
          export: {
            items: [
              { id: "md", label: "Markdown", filename: "launch-brief.md", content: allText },
              { id: "json", label: "JSON", filename: "launch-brief.json", content: () => JSON.stringify(data, null, 2) },
            ],
          },
        }}
      />
      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
      <KindPanelGrid minColumnWidth={280} gap="sm">
        {sections.map((section, index) => {
          const Icon = ICONS[section?.icon] ?? FileText;
          return (
            <KindPanel
              key={section?.id ?? index}
              title={streamText(section?.title, "Section")}
              icon={Icon}
              actions={<CopyButtons label={streamText(section?.title, "Section")} human={() => sectionText(section)} size="xs" hide={["export"]} />}
            >
              <div className="max-h-48 overflow-y-auto text-sm">
                <MarkdownStream content={streamText(section?.body, "")} />
              </div>
            </KindPanel>
          );
        })}
      </KindPanelGrid>
    </div>
  );
}
`;

export const LAUNCH_BRIEF_DEMO: PlaygroundDemo = {
  slug: "playground_launch_brief",
  title: "Launch brief",
  covers: ["Props", "Streaming", "Header copy", "Export", "Panel grid", "Markdown"],
  source,
  sample: {
    title: "Spring launch: Field Notes app",
    product: "Field Notes 2.0 for iOS and Android",
    summary:
      "Ship offline sync and shared notebooks to field researchers before the April survey season.",
    sections: [
      {
        id: "goal",
        icon: "goal",
        title: "Goal",
        body: "Reach **2,000 weekly active teams** within six weeks of launch.\n\n- Offline sync that never loses an entry\n- Shared notebooks with per-page comments",
      },
      {
        id: "audience",
        icon: "audience",
        title: "Audience",
        body: "Ecology survey crews, agricultural extension agents, and university field courses who work without signal for days at a time.",
      },
      {
        id: "timeline",
        icon: "timeline",
        title: "Timeline",
        body: "1. **Mar 3** beta to 40 crews\n2. **Mar 24** pricing page live\n3. **Apr 7** public launch with the Wildlife Society webinar",
      },
      {
        id: "risks",
        title: "Risks",
        body: "Sync conflicts on shared pages; app store review time for the Android release.",
      },
    ],
  },
};
