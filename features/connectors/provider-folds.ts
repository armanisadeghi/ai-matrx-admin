import type { IntegrationDirectoryItem } from "./integration-directory";

/**
 * ONE CARD PER PROVIDER (Arman, 2026-10-19). When the MCP server catalog lists
 * a provider that already has a native card, the catalog row is not a second
 * card — it becomes an ABILITY inside the native card, with its own connect
 * state and its own unchanged connect flow. This file is the one place that
 * says which catalog row folds into which native card.
 *
 * Keys are a catalog `slug` or `serverId`. `hidden` rows never get a card of
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
  "664215cc-038b-42f0-8d6c-dbf7f033835a": { provider: "notion", label: "Pages and databases" },
  "3d76093d-bb33-4be3-b524-8d7450b3c4ef": { provider: "slack", label: "Channels and messages" },
  "c8b34f8a-fbb4-479c-8899-250d61d3b346": { provider: "dropbox", label: "Read a chosen file" },
  "b412d0e9-3bef-4548-ab92-c52a7659e1c6": { provider: "box", label: "Files and documents" },
  "95a8007f-0000-0000-0000-000000000000": { provider: "microsoft", label: "Work insights" },
  "883a453d-0000-0000-0000-000000000000": { provider: "google", label: "Local Google tools", onlyWhenSaved: true },
  "ea2f73df-0000-0000-0000-000000000000": { provider: "google", label: "Drive and Docs on this computer", onlyWhenSaved: true },
};

/** What the native card's own connection is called once it shares a card. */
export const NATIVE_ABILITY_LABELS: Readonly<Record<string, string>> = {
  notion: "Formula values in imports",
  slack: "Automations and posting as you",
  dropbox: "Browse and import files",
  box: "Browse and import files",
  microsoft: "Mail, calendar and files",
  google: "Gmail, Drive, Calendar and more",
};

export interface IntegrationAbility {
  label: string;
  item: IntegrationDirectoryItem;
}
