import type { IntegrationDirectoryItem } from "./integration-directory";

/**
 * ONE CARD PER PROVIDER (Arman, 2026-10-19). When the MCP server catalog lists
 * a provider that already has a native card, the catalog row is not a second
 * card — it becomes an ABILITY inside the native card, with its own connect
 * state and its own unchanged connect flow. This file is the one place that
 * says which catalog row folds into which native card.
 *
 * Keys are catalog slugs. `hidden` rows never get a card of
 * their own and never become an ability (the native card is the whole story).
 * `onlyWhenSaved` rows are local developer setups: hidden until a person
 * already has a connection to them, then shown as an ability so nothing that
 * works is ever lost.
 */
export interface ProviderFold {
  /** Native directory item id without the `native:` prefix. */
  provider: string;
  /** Plain label of the ability this catalog row gives. */
  label: string;
  hidden?: boolean;
  onlyWhenSaved?: boolean;
}

export const PROVIDER_FOLDS: Readonly<Record<string, ProviderFold>> = {
  github: { provider: "github", label: "", hidden: true },
  notion: { provider: "notion", label: "Pages and databases" },
  slack: { provider: "slack", label: "Channels and messages" },
  dropbox: { provider: "dropbox", label: "Read a chosen file" },
  box: { provider: "box", label: "Files and documents" },
  "microsoft-work-iq": { provider: "microsoft", label: "Work insights" },
  "google-workspace": { provider: "google", label: "Local Google tools", onlyWhenSaved: true },
  "google-drive": { provider: "google", label: "Drive and Docs on this computer", onlyWhenSaved: true },
};

/** What the native card's own connection is called once it shares a card. */
export const NATIVE_ABILITY_LABELS: Readonly<Record<string, string>> = {
  notion: "Formula values in imports",
  slack: "Automations and posting",
  dropbox: "Browse and import files",
  box: "Browse and import files",
  microsoft: "Mail, calendar and files",
  google: "Gmail, Drive, Calendar and more",
};

export interface IntegrationAbility {
  label: string;
  item: IntegrationDirectoryItem;
}

export function foldFor(entry: { slug: string }): ProviderFold | undefined {
  return PROVIDER_FOLDS[entry.slug];
}

/**
 * Turns the flat native + catalog list into one card per provider. Pure: it
 * never drops a connection — a folded row that is saved stays reachable as an
 * ability, and the card's state is the best of all its abilities.
 */
export function foldAbilities(
  items: readonly IntegrationDirectoryItem[],
): IntegrationDirectoryItem[] {
  const folded = new Map<string, IntegrationAbility[]>();
  const rest: IntegrationDirectoryItem[] = [];
  for (const item of items) {
    const fold = item.server ? foldFor(item.server) : undefined;
    if (!item.server || !fold) {
      rest.push(item);
      continue;
    }
    if (fold.hidden) continue;
    if (fold.onlyWhenSaved && !item.saved) continue;
    folded.set(fold.provider, [
      ...(folded.get(fold.provider) ?? []),
      { label: fold.label, item },
    ]);
  }
  return rest.map((item) => {
    const abilities = folded.get(item.id.replace(/^native:/, ""));
    if (!item.id.startsWith("native:") || !abilities?.length) return item;
    const all = [item, ...abilities.map((ability) => ability.item)];
    const lead = item.saved ? item : (all.find((entry) => entry.saved) ?? item);
    const summary = [
      ...new Set(
        all.map((entry) => entry.accountSummary).filter((v): v is string => !!v),
      ),
    ].join(", ");
    return {
      ...item,
      abilities,
      ownState: {
        saved: item.saved,
        connected: item.connected,
        attention: item.attention,
        status: item.status,
      },
      keywords: `${item.keywords} ${abilities
        .map((ability) => `${ability.label} ${ability.item.name} ${ability.item.description} ${ability.item.keywords}`)
        .join(" ")}`,
      featured: all.some((entry) => entry.featured),
      saved: all.some((entry) => entry.saved),
      connected: all.some((entry) => entry.connected),
      attention: all.some((entry) => entry.attention),
      available: all.some((entry) => entry.available),
      status: lead.status,
      accountSummary: summary || undefined,
    };
  });
}
