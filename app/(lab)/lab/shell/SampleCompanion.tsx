"use client";

// PLAYGROUND MODULE: a small sample side chat, loaded by the frame through a dynamic import
// only when the person opens the side chat, so the lazy rule can be watched (the toolbar's
// "Loaded" readout). Static sample content.
import { useEffect, useState } from "react";
import { Webhook } from "lucide-react";
import { PanelTitle } from "@/features/shell/frame/FrameModules";
import type { CompanionProps } from "@/features/shell/frame/types";

export default function SampleCompanion({ onClose, companionSeed }: CompanionProps) {
  const [asked, setAsked] = useState<{ id: number; text: string; dictate?: boolean }[]>([]);
  // Each seed the frame hands over (from the page's ask bar) arrives once, as a message.
  useEffect(() => {
    if (!companionSeed) return;
    setAsked((list) => (list.some((m) => m.id === companionSeed.id) ? list : [...list, companionSeed]));
  }, [companionSeed]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="sample-companion">
      <PanelTitle icon={<Webhook />} title="Side chat" onClose={onClose} closeLabel="Close side chat" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <p className="type-body text-muted-foreground">How can I help on this page?</p>
        {asked.map((m) => (
          <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-accent px-3 py-2">
            <p className="type-body">{m.dictate ? `${m.text} (dictation starts here)`.trim() : m.text}</p>
          </div>
        ))}
        {asked.length > 0 ? <p className="type-meta text-muted-foreground">Sample reply goes here</p> : null}
      </div>
    </div>
  );
}
