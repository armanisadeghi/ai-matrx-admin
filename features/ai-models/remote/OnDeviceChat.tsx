"use client";

/**
 * /chat/on-device: the ONE chat column, fed by a host-owned source (on-device-sources.ts) instead of
 * the platform's database. Item 2: a local model on a computer of the person or their organization.
 * Item 3: "Claude (your plan)" — Claude Code on the person's own computer.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cpu, Lock } from "lucide-react";
import { AgentConversationColumn } from "@ai-matrx/chat/agents/components/shared/AgentConversationColumn";
import { useHostConversation } from "@ai-matrx/chat/agents/redux/execution-system/host-conversations/useHostConversation";
import { createDesktopProtocolTransport, type DesktopProtocolLikeClient } from "@ai-matrx/coding-sessions";
import { CodingSessionsClient } from "@ai-matrx/coding-sessions/react";
import type { ChatMessageSource } from "@ai-matrx/chat/host";

import { supabase } from "@/utils/supabase/client";
import { computerClient, modelName } from "./your-computers";
import { createClaudePlanSource, createComputerModelSource } from "./on-device-sources";

const SURFACE = "chat-on-device";
/** A Haiku-class model for "Claude (your plan)" turns unless the person picks another on that computer. */
const PLAN_MODEL = "haiku";

function useComputerName(deviceId: string | null): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!deviceId) return;
    let gone = false;
    void supabase
      .from("app_instances")
      .select("instance_name")
      .eq("id", deviceId)
      .maybeSingle()
      .then(({ data }) => {
        if (!gone) setName((data?.instance_name as string | null | undefined)?.trim() || "Your computer");
      });
    return () => {
      gone = true;
    };
  }, [deviceId]);
  return name;
}

export function OnDeviceChat() {
  const params = useSearchParams();
  const deviceId = params.get("d");
  const modelId = params.get("m");
  const plan = params.get("plan") === "claude";
  const computerName = useComputerName(deviceId);
  if (!deviceId || (!modelId && !plan)) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pick a model under Your computers in the chat.</div>;
  }
  if (!computerName) return null;
  return plan ? (
    <PlanRoom deviceId={deviceId} computerName={computerName} />
  ) : (
    <ModelRoom deviceId={deviceId} modelId={modelId as string} computerName={computerName} />
  );
}

function ModelRoom({ deviceId, modelId, computerName }: { deviceId: string; modelId: string; computerName: string }) {
  const source = useMemo(() => createComputerModelSource({ client: () => computerClient(deviceId), modelId, computerName }), [deviceId, modelId, computerName]);
  return (
    <Room
      source={source}
      title={`${modelName(modelId)} on ${computerName}`}
      message={`Answered on ${computerName}. Your words go only to that computer; AI Matrx never stores them.`}
      icon={<Lock className="h-10 w-10" />}
    />
  );
}

function PlanRoom({ deviceId, computerName }: { deviceId: string; computerName: string }) {
  const source = useMemo(() => {
    const transport = createDesktopProtocolTransport({ client: computerClient(deviceId) as unknown as DesktopProtocolLikeClient, deviceName: computerName });
    const coding = new CodingSessionsClient(transport);
    return createClaudePlanSource({
      coding,
      async start(prompt) {
        const folders = await coding.transport.call("recentFolders").catch(() => [] as Array<{ path: string; exists: boolean }>);
        const cwd = (folders as Array<{ path: string; exists: boolean }>).find((f) => f.exists)?.path ?? "~";
        const started = await coding.start({ provider: "claude", cwd, prompt, model: PLAN_MODEL });
        return started.session.id;
      },
    });
  }, [deviceId, computerName]);
  return (
    <Room
      source={source}
      title="Claude (your plan)"
      message={`Claude Code on ${computerName}, on your own Claude sign-in there. It can read files and run commands on that computer.`}
      icon={<Cpu className="h-10 w-10" />}
    />
  );
}

function Room({ source, title, message, icon }: { source: ChatMessageSource; title: string; message: string; icon: React.ReactNode }) {
  const [conversationId] = useState(() => globalThis.crypto.randomUUID());
  useHostConversation(source, conversationId, { surfaceKey: SURFACE });
  // Mount the column after the conversation is bound to its source (as Matrx 2's Confidential room does).
  const [bound, setBound] = useState(false);
  useEffect(() => setBound(true), []);
  if (!bound) return null;
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="chat-on-device">
      <AgentConversationColumn
        conversationId={conversationId}
        surfaceKey={SURFACE}
        constrainWidth
        hideCreatorPanel
        audience="expert"
        smartInputProps={{ draftAlias: `on-device:${conversationId}`, composer: { size: "page", mode: "chat", meta: "none", placeholder: "Message" } }}
        emptyContent={
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="text-muted-foreground">{icon}</div>
            <div className="text-base font-medium">{title}</div>
            <div className="max-w-md text-sm text-muted-foreground">{message}</div>
          </div>
        }
      />
    </div>
  );
}
