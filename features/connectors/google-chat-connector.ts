// features/connectors/google-chat-connector.ts
//
// GOOGLE, AS THE + MENU'S CONNECTIONS LIST SEES IT (Arman, 2026-10-20: "when
// someone searches Gmail that connection shows so they can connect their gmail
// instead of having to know that you need to do Google first").
//
// Google is not an MCP server: its connection lives in
// `users.integration_connections`, so the chat package's MCP-catalog list had no
// row for it. This builds the ONE row the list draws, from the same two sources
// every other Google surface reads — `provider-config.ts` (product names,
// promises, scopes: the only place that says what Google covers) and
// `google-status.ts` (which scope proves which product). Aliases ("email",
// "inbox") are the only words added here, so "gmail" finds the row the same way
// it finds the Google card in the directory.
//
// WHAT A CHAT CAN DO WITH EACH PRODUCT IS SAID, NOT IMPLIED. The chat's Google
// tools (the `google` bundle) read and append the Docs and Sheets a person
// picked, read the primary calendar, contacts and tasks, and PREPARE an email
// the person reviews and sends. There is no Gmail reading tool in chat:
// `inChat: false` rows still find the connector, and say so.

import type {
  FirstPartyConnector,
  FirstPartyProduct,
  FirstPartyState,
} from "@ai-matrx/chat/agents/connectors/first-party-connectors";
import type { GoogleConnectionSummary } from "@/features/marketing/google/types";
import { GOOGLE_CONNECTOR_PROVIDER } from "./provider-config";
import { googleConnectionForProduct, googleStaleConnectionFor } from "./google-status";
import { getConnector } from "./registry";

/** The chat tools Google's bundle gives a chat: the names a per-chat removal takes out. */
export const GOOGLE_CHAT_TOOL_NAMES = [
  "bundle:list_google",
  "google_workspace",
  "google_email_send",
] as const;

/** The MCP catalog rows Google replaces in the list (developer-only local servers). */
export const GOOGLE_REPLACED_CATALOG_SLUGS = ["google-workspace", "google-drive"] as const;

interface ChatProductFacts {
  terms: string;
  inChat: boolean;
  chatNote: string;
}

/** Keyed by `provider-config.ts` product key. A Google product not listed here is not offered in chat. */
const CHAT_PRODUCT_FACTS: Readonly<Record<string, ChatProductFacts>> = {
  workspace_files: {
    terms: "docs document sheets spreadsheet slides presentation drive files google docs google sheets google slides",
    inChat: true,
    chatNote: "Reads and edits the Docs and Sheets you pick.",
  },
  drive_browse: {
    terms: "drive files folders browse google drive",
    inChat: false,
    chatNote: "Browsing your Drive is not available in chat yet.",
  },
  gmail: {
    terms: "email mail inbox google mail send email compose draft",
    inChat: true,
    chatNote: "Drafts emails for you to review and send.",
  },
  gmail_read: {
    terms: "read email inbox search mail messages",
    inChat: false,
    chatNote: "Reading your inbox is not available in chat yet.",
  },
  gmail_modify: {
    terms: "label archive star email mail",
    inChat: false,
    chatNote: "Changing messages is not available in chat yet.",
  },
  calendar: {
    terms: "events schedule meetings google calendar agenda",
    inChat: true,
    chatNote: "Reads your calendar.",
  },
  contacts: {
    terms: "people address book google contacts",
    inChat: true,
    chatNote: "Looks up your contacts.",
  },
  tasks: {
    terms: "todo to-do google tasks",
    inChat: true,
    chatNote: "Reads your Google Tasks.",
  },
};

type Row = Pick<GoogleConnectionSummary, "health" | "scopes" | "account_email" | "account_name">;

function productFor(rows: readonly Row[], key: string): FirstPartyProduct | null {
  const product = GOOGLE_CONNECTOR_PROVIDER.products.find((p) => p.key === key);
  const facts = CHAT_PRODUCT_FACTS[key];
  if (!product || !facts) return null;
  return {
    key,
    name: product.name,
    terms: facts.terms,
    inChat: facts.inChat,
    chatNote: facts.chatNote,
    granted: googleConnectionForProduct(key, rows) !== undefined,
  };
}

/** The state of Google FOR A CHAT: connected when a healthy account holds any product a chat can use. */
export function googleChatState(
  rows: readonly Row[],
  read: { loading: boolean; failed: boolean },
): FirstPartyState {
  if (read.loading) return "loading";
  if (read.failed) return "unavailable";
  const chatKeys = Object.keys(CHAT_PRODUCT_FACTS).filter((key) => CHAT_PRODUCT_FACTS[key].inChat);
  if (chatKeys.some((key) => googleConnectionForProduct(key, rows) !== undefined)) return "connected";
  // An account that once held a chat product's grant but is no longer healthy: one reconnect repairs it.
  const stale = rows.some(
    (row) =>
      row.health !== "connected" &&
      (googleStaleConnectionFor("google-workspace", [row]) !== undefined ||
        googleStaleConnectionFor("gmail", [row]) !== undefined),
  );
  return stale ? "needs_reauth" : "not_connected";
}

export function buildGoogleChatConnector(
  rows: readonly Row[],
  read: { loading: boolean; failed: boolean },
): FirstPartyConnector {
  const state = googleChatState(rows, read);
  const markSource = getConnector(GOOGLE_CONNECTOR_PROVIDER.markConnectorId);
  const accounts = [
    ...new Set(
      rows
        .filter((row) => row.health === "connected")
        .map((row) => row.account_email ?? row.account_name)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  return {
    id: GOOGLE_CONNECTOR_PROVIDER.id,
    name: "Google Workspace",
    vendor: "Google",
    category: "productivity",
    mark: markSource ?? {
      id: GOOGLE_CONNECTOR_PROVIDER.markConnectorId,
      name: "Google Workspace",
      blurb: "",
      surfaces: ["directory"],
    },
    state,
    accountSummary: accounts.length > 0 ? accounts.join(", ") : undefined,
    products: Object.keys(CHAT_PRODUCT_FACTS)
      .map((key) => productFor(rows, key))
      .filter((product): product is FirstPartyProduct => product !== null),
    chatToolNames: GOOGLE_CHAT_TOOL_NAMES,
    replacesSlugs: GOOGLE_REPLACED_CATALOG_SLUGS,
  };
}
