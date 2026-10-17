// features/surfaces/manifests/data-tables.chat-role.ts — THE TABLE PAGE'S CHAT ROLE, declared once.
//
// The data-tables manifest lists this role in its Agents menu; the table page hands the SAME key to
// the shell's side chat (`useShellChatContext({ chatMandateKey })`), so "Open Side Chat" on /data/<id>
// starts the Data Table Assistant. Kept in its own tiny module so the page imports the key without
// importing the whole manifest.

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";

export const TABLE_CHAT_ROLE = {
  name: "table_chat",
  label: "Table chat",
  description:
    "Answers questions about this whole table from what is on screen, and proposes a table description or a single-cell edit for you to confirm.",
  kind: "single",
  mandateKey: MANDATE_KEYS.data__table_chat,
  defaultAgentId: null,
  autoRun: "never",
  sortOrder: 90,
} as const;
