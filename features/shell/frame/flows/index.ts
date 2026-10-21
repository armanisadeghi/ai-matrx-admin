// THE PRODUCT FLOWS — what every product holds and how its pages connect, one JSON per family
// (schema: SCHEMA.md; generated from the route map, reviewed by people). Read by the frame
// playground to draw each product's sidebar and its Flow view. Plain data, no React.
import build from "./build.json";
import business from "./business.json";
import marketing from "./marketing.json";
import memory from "./memory.json";
import productivity from "./productivity.json";
import solutions from "./solutions.json";
import yours from "./yours.json";

export type FlowRole =
  | "list"
  | "record"
  | "create"
  | "tool"
  | "settings"
  | "report"
  | "redirect"
  | "legacy"
  | "placeholder";

export interface FlowPage {
  route: string;
  title: string;
  role: FlowRole;
  reachedFrom?: string[];
  leadsTo?: string[];
}
export interface FlowSection {
  name: string;
  route?: string;
  why?: string;
  pages: FlowPage[];
}
export interface FlowJourney {
  name: string;
  steps: string[];
}
export interface FlowProduct {
  product: string;
  family: string;
  summary: string;
  entry?: string;
  sections: FlowSection[];
  journeys?: FlowJourney[];
  stranded?: { route: string; why: string; proposedHome?: string }[];
  buried?: { route: string; depth: number; why: string; proposal?: string }[];
  missingFromTree?: { name: string; route?: string; why: string }[];
  legacy?: { route: string; kind: string; note?: string }[];
  duplicates?: { routes: string[]; note: string }[];
}

/** Every flow product, in family-file order. */
export const FLOWS: readonly FlowProduct[] = (
  [yours, memory, build, productivity, business, marketing, solutions] as unknown as FlowProduct[][]
).flat();

/** Intelligence is ONE tile over six flows; each becomes one of its sidebar sections. */
export const INTELLIGENCE_PARTS = ["Mandates", "Agents", "Workflows", "Hindsight", "Replay", "Shapes"] as const;

/** Flow products that are not grid tiles, and where they live instead. */
export const FLOWS_OUTSIDE_THE_GRID: Readonly<Record<string, string>> = {
  Account: "the account menu",
  Everywhere: "the frame on every page",
  "Not in the app frame": "outside the app frame",
};

/** The flow product name for a tile name, where the two differ. */
const FLOW_NAME_FOR_TILE: Readonly<Record<string, string>> = { Other: "Other (Solutions)" };

export function flowByName(name: string): FlowProduct | undefined {
  return FLOWS.find((f) => f.product === name);
}

/** The flow behind a grid tile (Intelligence merges its six parts into one). */
export function flowForTile(tileName: string): FlowProduct | undefined {
  if (tileName === "Intelligence") {
    const parts = INTELLIGENCE_PARTS.map((n) => flowByName(n)).filter((f): f is FlowProduct => Boolean(f));
    return {
      product: "Intelligence",
      family: "Build",
      summary: "Mandates, Agents, Workflows, Hindsight, Replay and Shapes, as one product.",
      entry: parts[0]?.entry,
      sections: parts.flatMap((p) => p.sections.map((s) => ({ ...s, name: `${p.product} · ${s.name}` }))),
      journeys: parts.flatMap((p) => p.journeys ?? []),
      stranded: parts.flatMap((p) => p.stranded ?? []),
      buried: parts.flatMap((p) => p.buried ?? []),
      missingFromTree: parts.flatMap((p) => p.missingFromTree ?? []),
      legacy: parts.flatMap((p) => p.legacy ?? []),
      duplicates: parts.flatMap((p) => p.duplicates ?? []),
    };
  }
  return flowByName(FLOW_NAME_FOR_TILE[tileName] ?? tileName);
}

const NOT_REAL: ReadonlySet<FlowRole> = new Set(["redirect", "legacy", "placeholder"]);

/** The numbers the Flow view's header strip shows. */
export function flowCounts(flow: FlowProduct) {
  const pages = flow.sections.flatMap((s) => s.pages);
  return {
    pages: pages.filter((p) => !NOT_REAL.has(p.role)).length,
    placeholders: pages.filter((p) => p.role === "placeholder").length,
    stranded: flow.stranded?.length ?? 0,
    buried: flow.buried?.length ?? 0,
    legacy: (flow.legacy?.length ?? 0) + pages.filter((p) => p.role === "legacy" || p.role === "redirect").length,
    missing: flow.missingFromTree?.length ?? 0,
    duplicates: flow.duplicates?.length ?? 0,
  };
}
