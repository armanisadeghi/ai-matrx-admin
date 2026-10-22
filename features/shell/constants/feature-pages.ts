// feature-pages.ts — Pure data, no React imports.
// THE ONE PLACE a feature declares its page kind (policy: common-docs/policies/feature-pages.md,
// rule 1). `pnpm check:feature-pages` reads this file as text and checks the pages each kind owes.
//
// One row per FEATURE (a domain-tree node with its own pages), keyed by its address:
//   route  the feature's front-door address, no trailing /all  ("/agents", "/marketing/brands")
//   node   its domain-tree node (common-docs/policies/domain-tree.md)
//   kind   collection (front door, all, new, record) | workspace (front door, all, record) | tool (front door)
//
// Keep each row on ONE line with literal strings — the guard parses it with a regex.
// A top-level app/(core) feature with no row here is reported as "no kind": declare it, never hide it.

export type FeaturePageKind = "collection" | "workspace" | "tool";

export interface FeaturePageEntry {
  route: string;
  node: string;
  kind: FeaturePageKind;
}

export const FEATURE_PAGES: readonly FeaturePageEntry[] = [
  // agents
  { route: "/agents", node: "agents", kind: "collection" },
  { route: "/applets", node: "agents/agent-apps", kind: "collection" },
  { route: "/agent-connections", node: "agents/agent-connections", kind: "collection" },
  { route: "/mandates", node: "intelligence/mandates", kind: "collection" },
  // chat
  { route: "/chat", node: "chat", kind: "workspace" },
  { route: "/voice", node: "chat/voice", kind: "workspace" },
  { route: "/work", node: "chat/ai-work", kind: "workspace" },
  { route: "/memory", node: "chat/agent-memory", kind: "workspace" },
  // workflows
  { route: "/workflows", node: "workflows", kind: "collection" },
  { route: "/schedules", node: "workflows/automations", kind: "collection" },
  // masterwork, knowledge
  { route: "/masterwork", node: "masterwork", kind: "collection" },
  { route: "/knowledge", node: "knowledge", kind: "workspace" },
  { route: "/knowledge-graph", node: "knowledge/knowledge-graph", kind: "workspace" },
  { route: "/research", node: "knowledge/research", kind: "collection" },
  { route: "/rag", node: "knowledge/rag", kind: "workspace" },
  { route: "/scraper", node: "web/scraper", kind: "collection" },
  // files, media, content, data
  { route: "/files", node: "files", kind: "workspace" },
  { route: "/images", node: "media/images", kind: "workspace" },
  { route: "/transcripts", node: "audio/transcription", kind: "collection" },
  { route: "/notes", node: "content/notes", kind: "collection" },
  { route: "/documents", node: "content/documents", kind: "collection" },
  { route: "/workbooks", node: "content/workbooks", kind: "collection" },
  { route: "/presentations", node: "content/documents", kind: "collection" },
  { route: "/spaces", node: "content/spaces", kind: "collection" },
  { route: "/esign", node: "content/esign", kind: "collection" },
  { route: "/maps", node: "content/visual-maps", kind: "collection" },
  { route: "/visual-maps/lab", node: "content/visual-maps", kind: "workspace" },
  { route: "/markdown-studio", node: "content/content-utilities", kind: "tool" },
  { route: "/data", node: "data/data-tables", kind: "collection" },
  { route: "/pick-lists", node: "data/data-tables", kind: "collection" },
  { route: "/make", node: "workspace/make", kind: "workspace" },
  // code, publish
  { route: "/code", node: "code/code-workspace", kind: "workspace" },
  { route: "/cms", node: "publish/cms", kind: "collection" },
  { route: "/artifacts", node: "publish/artifacts", kind: "collection" },
  { route: "/podcast", node: "publish/podcasts", kind: "collection" },
  { route: "/print", node: "publish/printing", kind: "tool" },
  // communications, crm, marketing, hr
  { route: "/messages", node: "communications/internal-messaging", kind: "workspace" },
  { route: "/messenger", node: "communications/messaging", kind: "workspace" },
  { route: "/meetings", node: "communications/meet", kind: "workspace" },
  { route: "/notifications", node: "communications/notifications", kind: "workspace" },
  { route: "/crm", node: "crm", kind: "workspace" },
  { route: "/crm/deals", node: "crm/deals", kind: "collection" },
  { route: "/marketing/brands", node: "marketing/websites-and-brands", kind: "collection" },
  { route: "/hr", node: "human-resources", kind: "workspace" },
  // workspace
  { route: "/projects", node: "workspace/tasks-and-projects", kind: "collection" },
  { route: "/tasks", node: "workspace/tasks-and-projects", kind: "collection" },
  { route: "/board", node: "workspace/boards", kind: "collection" },
  { route: "/war-room", node: "workspace/war-room", kind: "collection" },
  { route: "/dashboard", node: "workspace/dashboard", kind: "workspace" },
  { route: "/launchpad", node: "workspace/launchpad", kind: "workspace" },
  { route: "/start", node: "workspace/start", kind: "workspace" },
  // account
  { route: "/organizations", node: "account/organizations", kind: "collection" },
  { route: "/vault", node: "account/vault-secrets", kind: "collection" },
  { route: "/approvals", node: "account/approvals", kind: "workspace" },
  { route: "/trash", node: "account/trash-and-exports", kind: "workspace" },
  { route: "/exports", node: "account/trash-and-exports", kind: "collection" },
  { route: "/libraries", node: "account/library", kind: "collection" },
  { route: "/devices", node: "computer", kind: "collection" },
  // tools
  { route: "/compare", node: "data/compare", kind: "tool" },
  { route: "/search", node: "platform/ui-shell/search", kind: "tool" },
];
