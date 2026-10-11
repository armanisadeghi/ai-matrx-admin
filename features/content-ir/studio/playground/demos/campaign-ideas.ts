import type { PlaygroundDemo } from "../types";

/** run_shortcut in a window, saveAs text from itemState, the image chain, KindImage, open/share file. */
const source = String.raw`import React from "react";
import { Lightbulb, MessageSquare, Sparkles, Image as ImageIcon, ExternalLink, Share2 } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { KindActionButton } from "@/components/kind-kit/KindActionButton";
import { KindImage } from "@/components/kind-kit/KindImage";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";

const IMAGE_PROMPT_SHORTCUT = "c70e1694-9b84-4843-9999-cb5471478bb4";
const PROMPT_TO_IMAGE_SHORTCUT = "a415f9f8-aa62-45f9-a532-5987da03ee59";

function ideaText(idea) {
  return "Idea " + idea.number + ": " + streamText(idea.title, "") + "\n" + streamText(idea.pitch, "");
}

function IdeaPanel({ idea, runAction, itemState }) {
  const promptKey = "idea_" + idea.number + "_prompt";
  const imageKey = "idea_" + idea.number + "_image";
  const prompt = typeof itemState?.[promptKey] === "string" ? itemState[promptKey] : null;
  const image = itemState?.[imageKey] && typeof itemState[imageKey] === "object" ? itemState[imageKey] : null;
  const [busy, setBusy] = React.useState(false);

  async function chain() {
    setBusy(true);
    try {
      const first = await runAction("run_shortcut", {
        shortcutId: IMAGE_PROMPT_SHORTCUT,
        scope: { selection: ideaText(idea) },
        expect: "text",
        saveAs: promptKey,
        label: "Image prompt",
      });
      if (!first.ok) return first;
      const text = typeof first.result === "string" ? first.result : JSON.stringify(first.result);
      return await runAction("run_shortcut", {
        shortcutId: PROMPT_TO_IMAGE_SHORTCUT,
        scope: { selection: text },
        expect: "image",
        saveAs: imageKey,
        label: "Image",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KindPanel
      title={streamText(idea.title, "Idea")}
      icon={Lightbulb}
      badge={"#" + idea.number}
      actions={<CopyButtons label={"Idea " + idea.number} human={() => ideaText(idea)} size="xs" hide={["export"]} />}
      footer={
        <div className="flex flex-wrap gap-1.5">
          <KindActionButton
            runAction={runAction}
            action="run_shortcut"
            input={() => ({ shortcutId: IMAGE_PROMPT_SHORTCUT, scope: { selection: ideaText(idea) }, label: "Discuss idea" })}
            label="Open in window"
            icon={MessageSquare}
            variant="outline"
          />
          <KindActionButton
            runAction={runAction}
            action="run_shortcut"
            input={() => ({ shortcutId: IMAGE_PROMPT_SHORTCUT, scope: { selection: ideaText(idea) }, expect: "text", saveAs: promptKey, label: "Image prompt" })}
            label={prompt ? "Rewrite prompt" : "Image prompt"}
            icon={Sparkles}
            variant="outline"
            confirm="Writes an image prompt. Uses credits."
          />
          <KindActionButton
            run={chain}
            label={image ? "New image" : "Make image"}
            icon={ImageIcon}
            confirm="Writes a prompt, then makes an image. Uses credits."
          />
        </div>
      }
    >
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-foreground">{streamText(idea.pitch, "")}</p>
        {prompt ? (
          <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">Prompt</span>
              <CopyButtons label="Image prompt" human={() => prompt} size="xs" hide={["export", "ai"]} />
            </div>
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap">{prompt}</p>
          </div>
        ) : null}
        <KindImage image={image} alt={streamText(idea.title, "Idea image")} runAction={runAction} pending={busy && !image} maxHeight={320} />
        {image?.file_id ? (
          <div className="flex gap-1.5">
            <KindActionButton runAction={runAction} action="open_file" input={{ file_id: image.file_id }} label="Open file" icon={ExternalLink} variant="ghost" compact />
            <KindActionButton runAction={runAction} action="share_file" input={{ file_id: image.file_id }} label="Share file" icon={Share2} variant="ghost" compact />
          </div>
        ) : null}
      </div>
    </KindPanel>
  );
}

export default function CampaignIdeas({ data, runAction, itemState }) {
  const { value: brand, arrived } = useStreamingValue(data?.brand, "");
  const ideas = streamList(data?.ideas).filter((idea) => idea && idea.number != null);
  if (!arrived && ideas.length === 0) return <StreamingSkeleton layout="cards" rows={3} />;
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={brand ? brand + " campaign ideas" : "Campaign ideas"}
        icon={Lightbulb}
        subtitle={streamText(data?.goal, "")}
        stats={[{ label: "ideas", value: ideas.length }]}
        copy={{ label: "Campaign ideas", human: () => ideas.map(ideaText).join("\n\n"), json: () => data }}
      />
      <KindPanelGrid minColumnWidth={300} gap="sm">
        {ideas.map((idea) => (
          <IdeaPanel key={idea.number} idea={idea} runAction={runAction} itemState={itemState} />
        ))}
      </KindPanelGrid>
    </div>
  );
}
`;

export const CAMPAIGN_IDEAS_DEMO: PlaygroundDemo = {
  slug: "playground_campaign_ideas",
  title: "Campaign ideas",
  covers: ["Run in window", "saveAs text", "Image chain", "KindImage", "open_file", "share_file"],
  source,
  savesItemState: true,
  sample: {
    brand: "Harbor Roasters",
    goal: "Fill the new waterfront cafe on weekday mornings",
    ideas: [
      {
        number: 1,
        title: "Ferry commuter punch card",
        pitch: "Every 7:10 ferry ticket shown at the counter earns a stamp; the tenth cup is on us.",
      },
      {
        number: 2,
        title: "Roast of the week window",
        pitch: "Roast a single origin in the front window every Tuesday so passers-by can watch and taste.",
      },
    ],
  },
};
