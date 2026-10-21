import type { McpCatalogEntry } from "@ai-matrx/chat/agents/types/mcp.types";
import { MCP_CATEGORY_META } from "@ai-matrx/chat/agents/types/mcp.types";
import { matchesConnectorSearch } from "@ai-matrx/chat/agents/connectors/connector-search";
import { readConnectionStatus } from "./connection-status";
import type { IntegrationAbility } from "./provider-folds";
import type { ConnectorDefinition } from "./types";

/** Everything a catalog connector can be found by besides its name: its slug and the products the catalog stores for it. */
export function catalogSearchKeywords(entry: Pick<McpCatalogEntry, "slug" | "products">): string {
  return [entry.slug, ...entry.products.flatMap((product) => [product.name, ...product.aliases])].join(" ");
}

export type DirectoryView = "discover" | "yours";
export type DirectoryFilter = "all" | "connected" | "available" | "coming_soon";
export interface IntegrationDirectoryItem {
  id: string;
  name: string;
  description: string;
  vendor: string;
  category: string;
  keywords: string;
  artwork: ConnectorDefinition;
  featured: boolean;
  saved: boolean;
  connected: boolean;
  available: boolean;
  comingSoon: boolean;
  status: string;
  attention: boolean;
  accountSummary?: string;
  /** The person's own accounts, deduplicated, service accounts excluded (`personAccounts`). */
  accounts?: readonly string[];
  /** Service accounts on this card: hidden from people, shown to admins behind Advanced. */
  serviceAccounts?: readonly string[];
  /**
   * Organizations that share an account of this kind with the viewer. Never
   * makes the item `saved`/`connected` — those describe the viewer's OWN
   * accounts (`connection-ownership.ts`).
   */
  sharedBy?: readonly string[];
  server?: McpCatalogEntry;
  /** Other ways to use this provider, folded into its one card (`provider-folds.ts`). */
  abilities?: readonly IntegrationAbility[];
  /** The native connection's own state, before the abilities were merged in. */
  ownState?: {
    saved: boolean;
    connected: boolean;
    attention: boolean;
    status: string;
  };
}

export interface DirectoryFilters {
  view: DirectoryView;
  query: string;
  category: string;
  status: DirectoryFilter;
  browse: "categories" | "all" | "featured";
}
export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = {
  view: "discover",
  query: "",
  category: "all",
  status: "all",
  browse: "categories",
};

export function filterDirectory(
  items: readonly IntegrationDirectoryItem[],
  filters: DirectoryFilters,
) {
  return items
    .filter((item) => {
      if (filters.view === "yours" && !item.saved && !item.sharedBy?.length)
        return false;
      if (filters.category !== "all" && item.category !== filters.category)
        return false;
      if (filters.status === "connected" && !item.connected) return false;
      if (filters.status === "available" && !item.available) return false;
      if (filters.status === "coming_soon" && !item.comingSoon) return false;
      if (
        filters.browse === "featured" &&
        filters.view === "discover" &&
        !item.featured
      )
        return false;
      const category =
        MCP_CATEGORY_META[item.category as keyof typeof MCP_CATEGORY_META]
          ?.label ?? item.category;
      return matchesConnectorSearch(
        filters.query,
        `${item.name} ${item.description} ${item.vendor} ${category} ${item.keywords} ${item.accountSummary ?? ""}`,
      );
    })
    .sort((a, b) => {
      if (filters.view === "yours" && a.attention !== b.attention)
        return a.attention ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** A machine identity (a Google service account, a Firebase admin SDK key): never a person's account. */
export function isServiceAccountIdentity(identity: string): boolean {
  return /\.gserviceaccount\.com$|firebase-adminsdk|\bservice[-_ ]account\b/i.test(identity);
}

/** The person's own accounts: trimmed, deduplicated without regard to case, service accounts set apart. */
export function personAccounts(identities: readonly string[]): {
  accounts: string[];
  serviceAccounts: string[];
} {
  const seen = new Set<string>();
  const accounts: string[] = [];
  const serviceAccounts: string[] = [];
  for (const raw of identities) {
    const identity = raw.trim();
    const key = identity.toLowerCase();
    if (!identity || seen.has(key)) continue;
    seen.add(key);
    (isServiceAccountIdentity(identity) ? serviceAccounts : accounts).push(identity);
  }
  return { accounts, serviceAccounts };
}

/** Two names, then a count: a card's foot never prints a whole list. */
export function compactAccounts(accounts: readonly string[], shown = 2): string {
  const head = accounts.slice(0, shown).join(", ");
  return accounts.length > shown ? `${head} +${accounts.length - shown}` : head;
}

export function savedAccountSummary(
  accounts: readonly { identity: string; status: string | null }[],
  loading: boolean,
  failed: boolean,
) {
  const states = accounts.map((account) =>
    account.status === "needs_reauth"
      ? "needs_attention"
      : readConnectionStatus(account.status).status,
  );
  const unknown = states.some((state) => state === null);
  const unavailable = states.includes("unavailable");
  const attention = states.includes("needs_attention");
  const connected = states.includes("connected");
  const { accounts: own, serviceAccounts } = personAccounts(
    accounts.map((account) => account.identity),
  );
  return {
    accounts: own,
    serviceAccounts,
    saved: accounts.length > 0,
    connected: !loading && !failed && connected,
    attention: !loading && !failed && !unknown && !unavailable && attention,
    available: !loading && !failed && !unknown && !unavailable,
    status: loading
      ? "Checking…"
      : failed || unknown
        ? "Status unavailable"
        : unavailable
          ? "Unavailable"
          : attention
            ? "Needs attention"
            : connected
              ? "Connected"
              : states.includes("revoked")
                ? "Revoked"
                : accounts.length > 0
                  ? "Disconnected"
                  : "Not connected",
    accountSummary: compactAccounts(own),
  };
}

/** Provider return URLs open the relevant detail without changing browsing state. */
export function directoryDetailFromParams(
  params: Pick<URLSearchParams, "get">,
): string | null {
  if (params.get("social_oauth_provider")) return "native:social-accounts";
  if (params.get("microsoft_status")) return "native:microsoft";
  const provider = params.get("provider");
  if (
    provider === "google" ||
    provider === "google-workspace" ||
    provider === "gmail"
  )
    return "native:google";
  if (provider === "microsoft") return "native:microsoft";
  if (provider === "github") return "native:github";
  if (
    provider === "dropbox" ||
    provider === "box" ||
    provider === "tiktok" ||
    provider === "x"
  )
    return `native:${provider}`;
  return provider ? `provider:${provider}` : null;
}
