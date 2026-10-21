"use client";

/**
 * The Studio assistant publishes itself to the Builder panel (admin, debug on): the mandate it runs through,
 * the workspace as a value, and — after each turn — a Provision window capture of everything the assistant was
 * handed, with the turn's AI run (the Watch AI door) as a ref. A no-op for anyone who is not an admin in debug
 * mode (`useBuilderFeed` records only then); nothing here changes what the page does.
 */

import { useEffect, useRef } from "react";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { selectOrderedMessageIds } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { captureProvision } from "@/features/provision-window/data";
import { STUDIO_ASSISTANT_MANDATE } from "./workspace-api";
import type { StudioWorkspace } from "./workspace";

export const STUDIO_BUILDER_SURFACE = "agents.studio";

export function useStudioBuilderFeed(chatId: string | null, ws: StudioWorkspace | null) {
  const feed = useBuilderFeed(STUDIO_BUILDER_SURFACE);
  const dispatch = useAppDispatch();
  const messageCount = useAppSelector((s) => (chatId ? selectOrderedMessageIds(chatId)(s).length : 0));
  const capturedAt = useRef<string>("");

  useEffect(() => {
    if (!feed.isActive) return;
    feed.publish({
      key: "studio.mandate",
      label: "Studio assistant mandate",
      group: "mandates",
      data: { mandate: STUDIO_ASSISTANT_MANDATE, conversationId: chatId },
      source: "agent-studio",
      ref: { type: "mandate", mandateKey: storedMandateKey(STUDIO_ASSISTANT_MANDATE), provisionKey: STUDIO_ASSISTANT_MANDATE },
    });
  });

  useEffect(() => {
    if (!feed.isActive || !ws) return;
    feed.publish({ key: "studio.workspace", label: "Studio workspace", group: "inputs", data: ws, source: "chat.conversation.metadata" });
  });

  // One capture per settled turn (an assistant answer landed): the exact values the assistant is handed.
  useEffect(() => {
    if (!feed.isActive || !chatId || messageCount < 2) return;
    const sig = `${chatId}:${messageCount}`;
    if (capturedAt.current === sig) return;
    capturedAt.current = sig;
    let live = true;
    void (async () => {
      try {
        const organizationId = await ensureOrgId(null);
        const snapshot = await captureProvision(dispatch, STUDIO_ASSISTANT_MANDATE, chatId, organizationId, "manual");
        if (!live) return;
        feed.publish([
          {
            key: `provision.${snapshot.id}`,
            label: `Provision: Studio assistant (turn ${messageCount})`,
            group: "provision",
            data: { snapshotId: snapshot.id, point: STUDIO_ASSISTANT_MANDATE },
            source: STUDIO_ASSISTANT_MANDATE,
            ref: { type: "provision_snapshot", id: snapshot.id },
          },
          {
            key: `ai.turn.${messageCount}`,
            label: `Assistant turn ${messageCount}`,
            group: "ai",
            data: { conversationId: chatId, messages: messageCount },
            source: "agent-studio",
            ref: { type: "ai_run", conversationId: chatId },
          },
        ]);
      } catch (e) {
        // A capture is a courtesy to the admin window; a failure never touches the person's chat.
        console.warn("[studio] the Builder feed capture failed", e);
      }
    })();
    return () => {
      live = false;
    };
  });
}
