import type { PlaygroundDemo } from "../types";

/** Sortable list with drag feedback, tag list add/remove/edit, picks kept on the item. */
const source = String.raw`import React from "react";
import { ListChecks, Star, Tags } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { SortableList } from "@/components/kind-kit/SortableList";
import { TagList } from "@/components/kind-kit/TagList";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function ordered(items, order) {
  if (!Array.isArray(order) || order.length === 0) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const out = order.map((id) => byId.get(id)).filter(Boolean);
  for (const item of items) if (!order.includes(item.id)) out.push(item);
  return out;
}

export default function SprintBacklog({ data, runAction, itemState }) {
  const { value: sprint, arrived } = useStreamingValue(data?.sprint, "");
  const stories = streamList(data?.stories).filter((story) => story && story.id);
  const savedLabels = Array.isArray(itemState?.labels) ? itemState.labels : null;
  const [labels, setLabels] = React.useState(null);
  const shownLabels = labels ?? savedLabels ?? streamList(data?.labels);
  const [order, setOrder] = React.useState(null);
  const shown = ordered(stories, order ?? itemState?.order);
  const starred = typeof itemState?.starred === "string" ? itemState.starred : null;
  const [error, setError] = React.useState(null);

  async function keep(patch) {
    const result = await runAction("save_item_state", { patch });
    setError(result.ok ? null : result.error);
  }
  function updateLabels(next) {
    setLabels(next);
    void keep({ labels: next });
  }

  if (!arrived && stories.length === 0) return <StreamingSkeleton layout="list" rows={4} />;

  const points = shown.reduce((sum, story) => sum + (Number(story.points) || 0), 0);
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={sprint || "Sprint backlog"}
        icon={ListChecks}
        stats={[{ label: "stories", value: shown.length }, { label: "points", value: points }]}
        copy={{
          label: "Sprint backlog",
          human: () => shown.map((story, i) => (i + 1) + ". " + story.title + " (" + (story.points ?? "?") + " pts)").join("\n"),
          json: () => ({ sprint, stories: shown, labels: shownLabels }),
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <KindPanelGrid minColumnWidth={280} gap="sm">
        <KindPanel title="Priority order" icon={ListChecks} count={shown.length}>
          <SortableList
            items={shown}
            getKey={(story) => story.id}
            onReorder={(next) => {
              const ids = next.map((story) => story.id);
              setOrder(ids);
              void keep({ order: ids });
            }}
            renderItem={(story, { isDragging }) => (
              <div className={cn("flex w-full items-start gap-2 py-0.5", isDragging && "opacity-80")}>
                <button
                  type="button"
                  aria-label={starred === story.id ? "Unstar" : "Star"}
                  onClick={() => void keep({ starred: starred === story.id ? null : story.id })}
                  className="mt-0.5 text-muted-foreground hover:text-primary"
                >
                  <Star className={cn("h-3.5 w-3.5", starred === story.id && "fill-primary text-primary")} />
                </button>
                <span className="flex-1 text-sm text-foreground">{streamText(story.title, "Story")}</span>
                {story.points != null ? <Badge variant="secondary">{story.points}</Badge> : null}
              </div>
            )}
            emptyState={<span className="text-xs text-muted-foreground">No stories</span>}
          />
        </KindPanel>
        <KindPanel title="Labels" icon={Tags} count={shownLabels.length}>
          <TagList
            items={shownLabels}
            onRemove={(key) => updateLabels(shownLabels.filter((label) => label !== key))}
            onEdit={(key, index, next) => updateLabels(shownLabels.map((label, i) => (i === index ? next : label)))}
            onAdd={(label) => updateLabels([...shownLabels, label])}
            addPlaceholder="Add label"
          />
        </KindPanel>
      </KindPanelGrid>
    </div>
  );
}
`;

export const SPRINT_BACKLOG_DEMO: PlaygroundDemo = {
  slug: "playground_sprint_backlog",
  title: "Sprint backlog",
  covers: ["Sortable list", "Tag list", "save_item_state", "Star pick"],
  source,
  savesItemState: true,
  sample: {
    sprint: "Sprint 14 — checkout",
    labels: ["payments", "mobile", "accessibility"],
    stories: [
      { id: "s1", title: "Apple Pay on the order review screen", points: 5 },
      { id: "s2", title: "Show delivery windows before payment", points: 3 },
      { id: "s3", title: "Screen reader labels on the cart stepper", points: 2 },
      { id: "s4", title: "Retry a declined card without losing the cart", points: 8 },
      { id: "s5", title: "Gift note field with a 200 character limit", points: 1 },
    ],
  },
};
