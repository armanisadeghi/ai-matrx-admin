import { AiWorkHeader } from "@/features/ai-work/components/AiWorkHeader";
import { AiWorkComposer } from "@/features/ai-work/compose/components/AiWorkComposer";
import { DEFAULT_NEW_CHAT_MANDATE_KEY } from "@ai-matrx/chat/agents/components/chat/chat-quick-actions.config";
import { mandateDisplaySeed } from "@ai-matrx/agents/mandates";

export function generateMetadata() {
  return { title: "Start work" };
}

/**
 * The agent that owns new work: the `chat.default_new_chat` mandate's system Holder,
 * painted from the GENERATED seed exactly as `/chat/new` does (Arman, 2026-10-16: zero
 * lookups before the send). No seed → null, and the composer asks the user to choose one.
 * There is no hardcoded-agent fallback.
 */
const DEFAULT_SEED = mandateDisplaySeed(DEFAULT_NEW_CHAT_MANDATE_KEY);

export default async function WorkNewPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request } = await searchParams;
  const agentId = DEFAULT_SEED?.agentId ?? null;
  const agentName = DEFAULT_SEED?.runTier.name ?? null;

  return (
    <>
      <AiWorkHeader />
      <div className="h-full min-h-0 overflow-y-auto pt-[var(--shell-header-h)]">
        <AiWorkComposer
          defaultAgentId={agentId}
          defaultAgentName={agentName}
          savedRequestId={request}
        />
      </div>
    </>
  );
}
