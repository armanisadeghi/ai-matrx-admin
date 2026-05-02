/**
 * Lightweight favicon route data — no icon imports, no JSX, server-safe.
 *
 * This is the single source of truth for route → favicon color/letter mapping.
 * `favicon-utils.ts` imports from here instead of `navigation-links.tsx` to
 * avoid pulling icon packages (react-icons, @tabler) into every layout's
 * server bundle.
 *
 * `navigation-links.tsx` imports from here too — so the data is never duplicated.
 */

export interface FaviconConfig {
  color: string;
  letter?: string;
  emoji?: string;
}

export interface FaviconRouteEntry {
  href: string;
  favicon?: FaviconConfig;
}

export const faviconRouteData: FaviconRouteEntry[] = [
  { href: "/dashboard", favicon: { color: "#0ea5e9", letter: "Db" } },
  { href: "/agents", favicon: { color: "#f43f5e", letter: "Ag" } },
  { href: "/ai/prompts", favicon: { color: "#a855f7", letter: "Pb" } },
  { href: "/prompt-apps", favicon: { color: "#059669", letter: "Pa" } },
  { href: "/research", favicon: { color: "#7c3aed", letter: "Rs" } },
  { href: "/chat", favicon: { color: "#2563eb", letter: "Ch" } },
  { href: "/notes", favicon: { color: "#d97706", letter: "No" } },
  { href: "/tasks", favicon: { color: "#16a34a", letter: "Tk" } },
  { href: "/projects", favicon: { color: "#4f46e5", letter: "Pj" } },
  { href: "/files", favicon: { color: "#0284c7", letter: "Fi" } },
  { href: "/transcripts", favicon: { color: "#9333ea", letter: "Tr" } },
  { href: "/data", favicon: { color: "#0891b2", letter: "Da" } },
  {
    href: "/demo/voice/voice-manager",
    favicon: { color: "#ea580c", letter: "Vo" },
  },
  {
    href: "/image-editing/public-image-search",
    favicon: { color: "#0d9488", letter: "Im" },
  },
  { href: "/image-studio", favicon: { color: "#c026d3", letter: "Is" } },
  { href: "/scraper", favicon: { color: "#3730a3", letter: "Ws" } },
  { href: "/sandbox", favicon: { color: "#c2410c", letter: "Sb" } },
  { href: "/messages", favicon: { color: "#db2777", letter: "Mg" } },
  { href: "/settings", favicon: { color: "#475569", letter: "St" } },
  { href: "/ai/cockpit", favicon: { color: "#7c3aed", letter: "Ac" } },
  { href: "/ai/recipes", favicon: { color: "#c026d3", letter: "Rc" } },
  { href: "/ai/runs", favicon: { color: "#0e7490", letter: "Ru" } },
  { href: "/legacy/workflows", favicon: { color: "#6d28d9", letter: "Wf" } },
  { href: "/lists", favicon: { color: "#1d4ed8", letter: "Li" } },
  { href: "/registered-results", favicon: { color: "#831843", letter: "Rr" } },
  { href: "/legacy/entity-admin", favicon: { color: "#854d0e", letter: "Ea" } },
  { href: "/administration" },
  { href: "/administration/official-components" },
  { href: "/admin" },
  { href: "/tests/forms/entity-final-test" },
  { href: "/tests/socket-tests/redux-form-test" },
  { href: "/apps", favicon: { color: "#14532d", letter: "Ah" } },
  { href: "/apps/app-builder", favicon: { color: "#4c1d95", letter: "Ab" } },
  { href: "/apps/demo", favicon: { color: "#be123c", letter: "Ad" } },
  { href: "/apps/dynamic-layouts/options" },
  { href: "/apps/all-layouts" },
  { href: "/apps/builder/hub", favicon: { color: "#1e3a8a", letter: "Bh" } },
  { href: "/tests/markdown-tests" },
  { href: "/admin/socketio" },
  { href: "/demo/many-to-many-ui/claude" },
  { href: "/demo/workflows" },
  { href: "/tests/tailwind-test" },
  { href: "/admin/registered-functions" },
  { href: "/legacy/administration/schema-manager" },
  { href: "/administration/utils/text-cleaner" },
  { href: "/tests/forms" },
  { href: "/tests/selector-test" },
  { href: "/tests/matrx-table" },
  { href: "/demo/prompt-builder" },
  { href: "/legacy/entity-crud", favicon: { color: "#0369a1", letter: "Ec" } },
  { href: "/admin/sandbox" },
];
