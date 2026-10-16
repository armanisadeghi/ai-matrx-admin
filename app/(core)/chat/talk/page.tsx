import { redirect } from "next/navigation";
import { mandateDisplaySeed } from "@ai-matrx/agents/mandates";
import { DEFAULT_NEW_CHAT_MANDATE_KEY } from "@ai-matrx/chat/agents/components/chat/chat-quick-actions.config";
import { getServerAuth } from "@/utils/supabase/getServerAuth";

/**
 * `/chat/talk` — start talking with the agent that owns new chats, the same
 * `chat.default_new_chat` mandate `/chat/new` paints. ZERO LOOKUPS (Arman,
 * 2026-10-16): its system Holder is the GENERATED seed (`MANDATE_DISPLAY_SEEDS`,
 * release-checked against the live binding) — the same system-rung answer the
 * old SSR read gave, with no read. A signed-out guest, or a key with no seed,
 * goes to `/chat/new`, which resolves in the browser and fails loudly there.
 */
export default async function VoiceChatEntryPage() {
  const seed = mandateDisplaySeed(DEFAULT_NEW_CHAT_MANDATE_KEY);
  const auth = await getServerAuth();
  if (!seed || (!auth.isAuthenticated && !auth.authUnavailable)) redirect("/chat/new");
  redirect(`/chat/talk/a/${encodeURIComponent(seed.agentId)}`);
}
