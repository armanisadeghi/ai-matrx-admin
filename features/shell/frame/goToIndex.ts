// THE "GO TO" INDEX — every product and every page the generated route table knows, as one flat
// list the palette ranks. Pure data: built from FRAME_ROUTE_HOMES (the small generated table the
// frame already holds), never from flows/*.json or route-flow.json. Only GoToPalette imports this
// file, and the palette loads on first open, so none of it runs on page load. A dynamic route
// ([id]) is not listed: the list page that leads to it is.
import type { SearchableEntry } from "./searchEngine";
import type { FrameRouteHomes } from "./route-homes-types";
import type { FrameProduct, ProductFamily } from "./types";

export interface GoToEntry extends SearchableEntry {
  productId: string;
}

/** The group the host's own menu entries (`extras`) are listed under. */
export const MENU_GO_TO_PRODUCT_ID = "menu";

/** What else a person calls a product. Names are searched first; these catch the other words. */
export const PRODUCT_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  home: ["dashboard", "today", "start", "launchpad"],
  workspace: ["boards", "kanban", "projects", "tasks", "todo", "spaces", "war room"],
  chat: ["conversation", "talk", "ask", "message ai", "assistant", "voice"],
  memory: ["knowledge", "remember", "search", "library", "research", "notes brain"],
  intelligence: ["agents", "ai", "mandates", "workflows", "automation", "bots"],
  masterwork: ["vision", "interview", "rulebook", "expertise"],
  applets: ["apps", "tools", "build an app", "no code"],
  code: ["developer", "programming", "editor", "sandbox", "ide"],
  connectors: ["integrations", "connect", "google", "plugins", "sources"],
  docs: ["notes", "documents", "write", "slides", "pages", "markdown"],
  data: ["tables", "spreadsheet", "database", "sheets", "records"],
  drive: ["files", "storage", "folders", "upload"],
  media: ["images", "video", "photos", "pictures", "gallery"],
  audio: ["voice", "podcast", "recording", "speech", "transcribe"],
  crm: ["contacts", "customers", "leads", "clients", "sales"],
  hr: ["people", "employees", "payroll", "hiring", "time clock"],
  marketing: ["seo", "brand", "campaign", "content", "ads", "social"],
  meet: ["meeting", "video call", "calendar", "schedule"],
  messages: ["sms", "email", "inbox", "text", "mail"],
  "business-tools": ["invoices", "forms", "contracts", "operations"],
  education: ["learn", "study", "school", "teach", "course", "tutor"],
  legal: ["law", "attorney", "contract", "case"],
  medical: ["health", "clinic", "patient", "doctor"],
  "e-commerce": ["shop", "store", "products", "orders", "sell"],
};

const isConcrete = (pattern: string) => !pattern.includes("[");

export function buildGoToIndex(
  products: readonly FrameProduct[],
  families: readonly { id: ProductFamily; label: string }[],
  homes: FrameRouteHomes,
  extras: readonly GoToEntry[] = [],
): GoToEntry[] {
  const out: GoToEntry[] = [];
  const seen = new Set<string>();
  const push = (entry: GoToEntry) => {
    const key = `${entry.productId}\u0000${entry.href}\u0000${entry.label.toLocaleLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };
  const familyLabel = new Map(families.map((f) => [f.id, f.label]));

  for (const product of products) {
    const home = homes.products[product.id];
    const words = [...(PRODUCT_SYNONYMS[product.id] ?? []), familyLabel.get(product.family) ?? ""].filter(Boolean);
    push({
      id: `product:${product.id}`,
      productId: product.id,
      label: product.name,
      trail: [],
      href: home?.entry ?? product.homeHref,
      keywords: words,
    });
    const itemLabels: string[] = [];
    home?.items.forEach(([section, label, pattern, fallbackHref], index) => {
      itemLabels[index] = label;
      push({
        id: `item:${product.id}:${index}`,
        productId: product.id,
        label,
        trail: section ? [product.name, section] : [product.name],
        href: isConcrete(pattern) ? pattern : fallbackHref,
        keywords: words,
      });
    });
    for (const [pattern, productId, itemIndex, title] of homes.routes) {
      if (productId !== product.id || !title || !isConcrete(pattern)) continue;
      const parent = itemIndex >= 0 ? itemLabels[itemIndex] : undefined;
      push({
        id: `route:${pattern}`,
        productId: product.id,
        label: title,
        trail: parent && parent !== title ? [product.name, parent] : [product.name],
        href: pattern,
        keywords: words,
      });
    }
  }
  // A page the frame already lists (same address and name) is not listed twice under "App menu".
  const listed = new Set(out.map((e) => `${e.href}\u0000${e.label.toLocaleLowerCase()}`));
  for (const entry of extras) {
    if (listed.has(`${entry.href}\u0000${entry.label.toLocaleLowerCase()}`)) continue;
    push(entry);
  }
  return out;
}
