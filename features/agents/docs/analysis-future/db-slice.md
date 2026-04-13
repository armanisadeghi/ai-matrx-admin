**1) `chatConversations` (`cx-conversation/redux/slice.ts`)**  
This is the one that actually holds **messages and tool data** from the CX stack: `messages`, `toolCallsById`, `protocolDbMessages`, `protocolDbToolCalls`, plus session `conversationId`. That’s your **`cx_message` + `cx_tool_call` + conversation id** in one place.

**2) `cxConversations` (`cx-chat/redux/cx-conversations.slice.ts`)**  
Holds **list rows** sourced from **`cx_conversation`** (sidebar). **No messages, no tool calls.**

**3) `agentConversations` (`agents/.../agent-conversations.slice.ts`)**  
Holds **another conversation list cache** from **`get_agent_conversations`**. In your app that’s the agent-scoped catalog; it’s **list/metadata**, not the full message bodies—but it’s still **conversation-level data** tied to the same product surface (often the same logical threads as `cx_conversation`, depending on how the RPC is defined in Supabase).

**4) `instanceConversationHistory` (`agents/.../instance-conversation-history.slice.ts`)**  
**Not filled by the CX load thunk by default**, but the **turn model is explicitly shaped to mirror `cx_message`** when you hydrate from DB. So this slice **can** hold **cx_message-shaped** (and tool/block) data in `turns[]` when that path is used—separate store from `chatConversations`.

---

**Short answer:**  
- **Messages + tool calls from DB/stream in the CX hook flow → mainly `chatConversations`.**  
- **`cx_conversation` list → `cxConversations` and usually also `agentConversations` (two list caches).**  
- **Agent runner transcript → `instanceConversationHistory` (can overlap cx_message shape when loaded).**

So it’s **not** “only two slices for everything CX”; it’s **one slice for full CX message/tool payloads**, **two for conversation lists**, and **optionally** **`instanceConversationHistory`** for transcript rows that mirror **`cx_message`**.