"use client";

/**
 * "Attach to chat" on an artifact block inside a message (rendered-output P2
 * WP4): one click attaches the type's default representation; the chevron
 * lists them all. The same `attachArtifactToChat` the canvas pane uses — the
 * screenshot captures the block as drawn, at attach time.
 */

import React, { useRef, useState } from "react";
import { ChevronDown, Maximize2, Paperclip } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStore } from "@/lib/redux/store-singleton";
import { artifactAttachOptions, attachArtifactToChat } from "./artifactAttach";
import { ArtifactVersionHistory } from "@/features/canvas/components/ArtifactVersionHistory";
import { isMaterializedArtifactId } from "@/features/canvas/artifact-types/artifactId";
import { useOpenArtifactInCanvas } from "@/features/canvas/hooks/useOpenArtifactInCanvas";
import type { CanvasContentType } from "@/features/canvas/canvasContent";
import type { RenderedArtifactRepresentation } from "@ai-matrx/chat/agents/types/instance.types";

export interface ArtifactBlockAttachProps {
  type: string;
  data: unknown;
  title: string;
  conversationId: string;
  messageId?: string;
  blockIndex?: number;
  artifactId?: string;
  /**
   * Whether the attach actions show. The wrapper itself is ALWAYS drawn while a block lives, so a
   * block that finishes streaming keeps its mounted component (a wrapper that appeared only once
   * the block settled was a new parent: React remounted the finished component, live /chat
   * 2026-10-17). False while streaming or with no conversation.
   */
  enabled?: boolean;
  children: React.ReactNode;
}

export function ArtifactBlockAttach({
  type,
  data,
  title,
  conversationId,
  messageId,
  blockIndex,
  artifactId,
  enabled = true,
  children,
}: ArtifactBlockAttachProps) {
  const body = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const options = artifactAttachOptions(type, data);
  const [first] = options;
  // A SAVED answer's artifact (its canvas row id) keeps the saved artifact's doors here — version
  // history and Open in canvas — beside the same body the live block drew (BlockRenderer Stage 3b).
  const savedId = isMaterializedArtifactId(artifactId) ? artifactId!.trim() : null;
  const { openArtifact } = useOpenArtifactInCanvas();

  const attachAs = async (representation: RenderedArtifactRepresentation) => {
    const store = getStore();
    if (!store) return;
    setBusy(true);
    try {
      await attachArtifactToChat({
        store,
        conversationId,
        type,
        title,
        data,
        canvasItemId: artifactId ?? null,
        blockKey: `${messageId ?? "message"}_${blockIndex ?? 0}_${type}`,
        representation,
        element: () => body.current,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group/artifact-attach relative" data-artifact-attach={type}>
      <div ref={body}>{children}</div>
      {enabled && first ? (
      <div className="absolute bottom-1 right-1 flex items-center opacity-0 transition-opacity group-hover/artifact-attach:opacity-100 focus-within:opacity-100">
        {savedId ? (
          <>
            <ArtifactVersionHistory
              canvasItemId={savedId}
              triggerClassName="rounded p-0.5 text-muted-foreground hover:text-foreground"
            />
            <Button
              variant="quiet"
              icon={<Maximize2 />}
              onClick={() =>
                void openArtifact({
                  canvasType: type as CanvasContentType,
                  conversationId,
                  title,
                  content: typeof data === "string" ? data : JSON.stringify(data),
                  messageId,
                  artifactId: savedId,
                  artifactIndex: (blockIndex ?? 0) + 1,
                })
              }
              title="Open in canvas"
              aria-label="Open in canvas"
            />
          </>
        ) : null}
        <Button
          variant="quiet"
          icon={<Paperclip />}
          disabled={busy}
          onClick={() => void attachAs(first.value)}
          title={`Attach ${first.label.toLowerCase()} to chat`}
          aria-label={`Attach ${first.label.toLowerCase()} to chat`}
          data-artifact-attach-default={first.value}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" icon={<ChevronDown />} title="Attach to chat as…" aria-label="Attach to chat as…" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={Boolean(option.unavailable)}
                onSelect={() => void attachAs(option.value)}
                data-artifact-attach-as={option.value}
              >
                {option.unavailable ?? `Attach ${option.label.toLowerCase()}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      ) : null}
    </div>
  );
}
