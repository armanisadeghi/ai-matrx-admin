/**
 * GOOGLE IN THE + MENU'S CONNECTIONS LIST (Arman, 2026-10-20: "when someone
 * searches Gmail that connection shows so they can connect their gmail").
 *
 * Google is not an MCP server, so the chat's list had no row for it. This is
 * the row, built from the SAME sources every Google surface reads
 * (`provider-config.ts`, `google-status.ts`). The assertions run the host row
 * through the chat package's REAL list builder, and through the directory's own
 * search, so the two search surfaces cannot disagree about "gmail".
 *
 * Mutation: drop the Gmail aliases, count `gmail_read` as usable in chat, or
 * call a row with a stale account "connected" — each case goes RED.
 */
import { buildConnectorList } from "@ai-matrx/chat/agents/connectors/chat-connector-list";
import { GOOGLE_SCOPE, GOOGLE_WORKSPACE_FILE_SCOPES } from "@/lib/googleScopes";
import { filterDirectory, DEFAULT_DIRECTORY_FILTERS } from "../integration-directory";
import type { IntegrationDirectoryItem } from "../integration-directory";
import { GOOGLE_CONNECTOR_PROVIDER } from "../provider-config";
import { CATALOG_SEARCH_TERMS } from "../connector-search-terms";
import {
  GOOGLE_CHAT_TOOL_NAMES,
  buildGoogleChatConnector,
  googleChatState,
} from "../google-chat-connector";

const settled = { loading: false, failed: false };
type TestRow = Parameters<typeof buildGoogleChatConnector>[0][number];
const row = (scopes: string[], health: TestRow["health"] = "connected"): TestRow => ({
  health,
  scopes,
  account_email: "info@aimatrx.com",
  account_name: null,
});
const SEND_ONLY = row([...GOOGLE_WORKSPACE_FILE_SCOPES.slice(0, 3), GOOGLE_SCOPE.gmailSend]);
const DOCS = row([...GOOGLE_WORKSPACE_FILE_SCOPES]);

const listFor = (rows: TestRow[], needle: string, state = settled) =>
  buildConnectorList({
    servers: [],
    firstParty: [buildGoogleChatConnector(rows, state)],
    searchTermsBySlug: CATALOG_SEARCH_TERMS,
    added: [],
    agentSlugs: new Set(),
    removedTools: [],
    runAttachmentSlugs: new Set(),
    needle,
  });

describe("the Google state a chat sees", () => {
  it("is not connected with no account, and connected with a healthy account holding a chat product", () => {
    expect(googleChatState([], settled)).toBe("not_connected");
    expect(googleChatState([DOCS], settled)).toBe("connected");
    expect(googleChatState([SEND_ONLY], settled)).toBe("connected");
  });

  it("an account that only holds a product chat cannot use (the Search Console grant) is not connected for chat", () => {
    expect(googleChatState([row(["openid", GOOGLE_SCOPE.webmastersReadonly])], settled)).toBe("not_connected");
  });

  it("an expired account is repairable, never 'connected'", () => {
    expect(googleChatState([row([...GOOGLE_WORKSPACE_FILE_SCOPES], "needs_reauth")], settled)).toBe("needs_reauth");
  });

  it("says loading and unavailable instead of guessing 'not connected'", () => {
    expect(googleChatState([], { loading: true, failed: false })).toBe("loading");
    expect(googleChatState([], { loading: false, failed: true })).toBe("unavailable");
  });
});

describe("searching in the + menu", () => {
  it.each(["gmail", "email", "inbox", "mail", "calendar", "sheets", "docs", "drive", "google calendar"])(
    "%s finds Google Workspace with nothing connected",
    (word) => {
      const out = listFor([], word);
      expect(out.map((r) => r.key)).toEqual(["fp:google"]);
      expect(out[0].group).toBe("all");
    },
  );

  it("names Gmail as the reason and offers it to Connect", () => {
    const out = listFor([], "gmail");
    expect(out[0].kind === "first_party" && out[0].matchedProduct?.key).toBe("gmail");
  });

  it("offers 'Add Gmail' to an account that holds Docs and Sheets only", () => {
    const out = listFor([DOCS], "gmail");
    expect(out[0].kind === "first_party" && out[0].addProduct?.key).toBe("gmail");
    expect(out[0].group).toBe("active");
  });

  it("offers nothing to add once the account holds Gmail", () => {
    const out = listFor([DOCS, SEND_ONLY], "gmail");
    expect(out[0].kind === "first_party" && out[0].addProduct).toBeNull();
  });

  it("says reading the inbox is not in chat yet instead of pretending a Gmail switch gives it", () => {
    const out = listFor([DOCS], "read email");
    const product = out[0].kind === "first_party" ? out[0].matchedProduct : null;
    expect(product?.key).toBe("gmail_read");
    expect(product?.inChat).toBe(false);
    expect(out[0].kind === "first_party" && out[0].addProduct).toBeNull();
  });

  it("finds Microsoft Work IQ by Outlook and Teams through the catalog terms", () => {
    expect(CATALOG_SEARCH_TERMS["microsoft-work-iq"].join(" ")).toMatch(/Outlook/);
    expect(CATALOG_SEARCH_TERMS["microsoft-work-iq"].join(" ")).toMatch(/Teams/);
  });
});

describe("the chat and the directory window agree on the same words", () => {
  const googleCard: IntegrationDirectoryItem = {
    id: "native:google",
    name: "Google Workspace",
    description: "Connect Gmail, Drive, Calendar and the Google products you use.",
    vendor: "Google",
    category: "productivity",
    // Exactly how IntegrationsSettingsPage builds the native Google card's keywords.
    keywords: GOOGLE_CONNECTOR_PROVIDER.products.map((p) => `${p.name} ${p.promise}`).join(" "),
    artwork: { id: "google", name: "Google Workspace", blurb: "", surfaces: ["directory"] },
    featured: true,
    saved: false,
    connected: false,
    available: true,
    comingSoon: false,
    status: "Not connected",
    attention: false,
  };

  it.each(["gmail", "calendar", "drive", "sheets", "docs", "google"])("%s finds Google in both", (word) => {
    const inDirectory = filterDirectory([googleCard], { ...DEFAULT_DIRECTORY_FILTERS, query: word }).length > 0;
    const inChat = listFor([], word).length > 0;
    expect({ word, inDirectory, inChat }).toEqual({ word, inDirectory: true, inChat: true });
  });
});

describe("the connector row", () => {
  it("replaces the two developer-only Google catalog rows and carries the tools a chat switch removes", () => {
    const c = buildGoogleChatConnector([DOCS], settled);
    expect(c.replacesSlugs).toEqual(["google-workspace", "google-drive"]);
    expect(c.chatToolNames).toEqual([...GOOGLE_CHAT_TOOL_NAMES]);
    expect(c.accountSummary).toBe("info@aimatrx.com");
  });

  it("every product it offers exists in the provider config (one source for names)", () => {
    const c = buildGoogleChatConnector([], settled);
    const known = new Set(GOOGLE_CONNECTOR_PROVIDER.products.map((p) => p.key));
    expect(c.products.length).toBeGreaterThan(0);
    for (const product of c.products) expect(known.has(product.key)).toBe(true);
  });
});
