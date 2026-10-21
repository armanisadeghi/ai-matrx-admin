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
// promises, scopes AND the words a person types to find each product: the only
// place that says what Google covers) and `google-status.ts` (which scope proves
// which product). Nothing here lists search words, so "gmail" finds the row the
// same way it finds the Google card in the directory.
//
// ONE TRUTH WITH THE BROWSE WINDOW (Arman, 2026-10-20: the menu said "Active,
// Gmail" while the window said "Needs reconnecting"). The state is the window's
// own: the SAME `savedAccountSummary` over the SAME accounts (the viewer's own,
// `googleAccountSummary` below). Any of their accounts needing repair makes
// Google "needs repair" here exactly as it does there.
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
import { savedAccountSummary } from "./integration-directory";
import { splitConnectionsByOwnership, type ConnectionViewer } from "./connection-ownership";
import { GOOGLE_CONNECTOR_PROVIDER } from "./provider-config";
import { googleConnectionForProduct } from "./google-status";
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
  inChat: boolean;
  chatNote: string;
}

/**
 * What a CHAT can do with each Google product (the `google` tool bundle: it reads and appends the Docs
 * and Sheets a person picked, reads the primary calendar, contacts and tasks, and prepares an email the
 * person reviews). Keyed by `provider-config.ts` product key; a product not listed here is findable in
 * search but says it is not in chat yet. The words that FIND a product are `searchTerms` in the config.
 */
const CHAT_PRODUCT_FACTS: Readonly<Record<string, ChatProductFacts>> = {
  workspace_files: { inChat: true, chatNote: "Reads and edits the Docs and Sheets you pick." },
  drive_browse: { inChat: false, chatNote: "Browsing your Drive is not available in chat yet." },
  gmail: { inChat: true, chatNote: "Drafts emails for you to review and send." },
  gmail_read: { inChat: false, chatNote: "Reading your inbox is not available in chat yet." },
  gmail_modify: { inChat: false, chatNote: "Changing messages is not available in chat yet." },
  calendar: { inChat: true, chatNote: "Reads your calendar." },
  contacts: { inChat: true, chatNote: "Looks up your contacts." },
  tasks: { inChat: true, chatNote: "Reads your to-do list." },
};

const NOT_IN_CHAT: ChatProductFacts = { inChat: false, chatNote: "Not available in chat yet." };

type Row = Pick<GoogleConnectionSummary, "health" | "scopes" | "account_email" | "account_name">;

function productFor(rows: readonly Row[], key: string): FirstPartyProduct | null {
  const product = GOOGLE_CONNECTOR_PROVIDER.products.find((p) => p.key === key);
  if (!product) return null;
  const facts = CHAT_PRODUCT_FACTS[key] ?? NOT_IN_CHAT;
  return {
    key,
    name: product.name,
    terms: product.searchTerms,
    inChat: facts.inChat,
    chatNote: facts.chatNote,
    granted: googleConnectionForProduct(key, rows) !== undefined,
  };
}

/** The Google accounts that are THE VIEWER'S OWN (an organization's shared account is named as shared, never counted as theirs). */
export function ownGoogleConnections<T extends Pick<GoogleConnectionSummary, "owner_type" | "owner_user_id" | "organization_id">>(
  rows: readonly T[],
  viewer: ConnectionViewer,
): T[] {
  return splitConnectionsByOwnership(
    rows.map((row) => ({
      row,
      ownerKind: row.owner_type === "organization" ? ("organization" as const) : ("person" as const),
      ownerUserId: row.owner_user_id,
      organizationId: row.organization_id,
    })),
    viewer,
  ).mine.map((owned) => owned.row);
}

/**
 * The Google card's summary, exactly as the Browse window draws it: the viewer's OWN accounts through
 * `savedAccountSummary`. The window shows `status`; the chat reads the same word through
 * `googleChatState` — one function, so the two cannot disagree.
 */
export function googleAccountSummary(rows: readonly Row[], read: { loading: boolean; failed: boolean }) {
  return savedAccountSummary(
    rows.map((account) => ({
      identity: account.account_email ?? account.account_name ?? "Google account",
      status: account.health,
    })),
    read.loading,
    read.failed,
  );
}

/** The state of Google FOR A CHAT: the window's own word for it, in the chat's vocabulary. */
export function googleChatState(
  rows: readonly Row[],
  read: { loading: boolean; failed: boolean },
): FirstPartyState {
  if (read.loading) return "loading";
  if (read.failed) return "unavailable";
  const summary = googleAccountSummary(rows, read);
  // `attention` outranks `connected` there too: one account that needs repair makes the card say so.
  if (summary.attention) return "needs_reauth";
  if (summary.status === "Status unavailable" || summary.status === "Unavailable") return "unavailable";
  if (summary.connected) return "connected";
  return "not_connected";
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
    products: GOOGLE_CONNECTOR_PROVIDER.products
      .map((product) => productFor(rows, product.key))
      .filter((product): product is FirstPartyProduct => product !== null),
    chatToolNames: GOOGLE_CHAT_TOOL_NAMES,
    replacesSlugs: GOOGLE_REPLACED_CATALOG_SLUGS,
  };
}
