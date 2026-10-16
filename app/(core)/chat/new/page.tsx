import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  ChatNewClient,
  ChatNewLandingSkeleton,
} from "@ai-matrx/chat/agents/components/chat/ChatNewClient";
import { ChatNewHeader } from "@ai-matrx/chat/agents/components/chat/ChatNewHeader";
import { readComposerModeCookie } from "@ai-matrx/chat/next/server/composer-mode.server";
import { DEFAULT_NEW_CHAT_MANDATE_KEY } from "@ai-matrx/chat/agents/components/chat/chat-quick-actions.config";
import { mandateDisplaySeed } from "@ai-matrx/agents/mandates";
import { isUuidShape } from "@ai-matrx/kit/uuid";

/**
 * ZERO LOOKUPS (Arman, 2026-10-15): the default chat agent is never read to paint
 * this page. Its name, description and run settings are the GENERATED seed of the
 * mandate's system Holder (`MANDATE_DISPLAY_SEEDS`, written from the live binding and
 * release-checked by `mandate-display-seeds`). The send goes through the mandate
 * door, where the server applies this person's own binding.
 */
const DEFAULT_SEED = mandateDisplaySeed(DEFAULT_NEW_CHAT_MANDATE_KEY);

/** A `?agent=<id>` agent's display name for first paint (one column, that agent only). */
async function resolveAgentName(agentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("agent")
    .from("definition")
    .select("name")
    .is("deleted_at", null)
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) return null;
  return data.name ?? null;
}

/** `?agent=<id>` — an explicit agent for this new chat (feedback c0875460). */
function requestedAgentId(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const raw = searchParams.agent;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && isUuidShape(value) ? value : null;
}

/**
 * 🚨 THE PAGE STREAMS. Nothing here is awaited above a Suspense boundary: the
 * shell and the composer outline go out with the first byte. The default agent
 * is the generated seed above — no read at all.
 */
export default function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ChatNewLandingSkeleton />}>
      <NewChatSeeded searchParams={searchParams} />
    </Suspense>
  );
}

async function NewChatSeeded({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pinnedAgentId = requestedAgentId(await searchParams);
  const [initialMode, pinnedAgentName] = await Promise.all([
    readComposerModeCookie(),
    pinnedAgentId ? resolveAgentName(pinnedAgentId) : Promise.resolve(null),
  ]);
  // An explicit agent wins over the default-chat mandate; it is addressed
  // directly (like /chat/a/[agentId]) so an unreadable id shows the access
  // gate rather than silently answering with someone else.
  const agentId = pinnedAgentId ?? DEFAULT_SEED?.agentId ?? null;
  const defaultAgentName = pinnedAgentId ? pinnedAgentName : (DEFAULT_SEED?.runTier.name ?? null);
  return (
    <>
      <ChatNewHeader
        agentId={agentId}
        initialAgentName={defaultAgentName ?? undefined}
        composerMode={{ initialMode }}
      />
      <Suspense fallback={<ChatNewLandingSkeleton />}>
        <ChatNewClient
          agentId={agentId}
          pinned={Boolean(pinnedAgentId)}
          composer={{ initialMode }}
        />
      </Suspense>
      {/* No conversion nudge here: the send gate is gone (guests send for
          real), so gate-attempt-driven nudges can never fire on this page. */}
    </>
  );
}
