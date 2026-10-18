// features/spaces/templates/build-agency-pack.ts — writes packs/traveling-smm-os.pack.json from the built-in
// sample's TypeScript (data/agency-spec.ts tables, store/seed.ts pages), so the sample and its pack never drift.
//   pnpm exec tsx features/spaces/templates/build-agency-pack.ts
// Database blocks become { kind: "template", table, view } tokens, page links become "page:<key>", block ids
// are dropped (each use makes fresh ones).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { PackBlock, PackPage, SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import type { SpaceBlock, RichSpan } from "../contract";
import type { AgencyTables } from "../data/agency-install";
import { AGENCY_SPEC } from "../data/agency-spec";
import { SAMPLE_COVER, SEED_ROOT_ID, seedSpaces } from "../store/seed";

import { PACKS_DIR } from "./pack-files";

const VIEW_OF = { client: "all_clients", nps_survey: "all_surveys", client_win: "all_wins", task: "all_tasks" } as const;
const tokens = Object.fromEntries(Object.entries(VIEW_OF).map(([t, v]) => [t, { tableId: `tbl:${t}`, viewId: `view:${v}`, name: AGENCY_SPEC.tables.find((x) => x.token === t)!.name }])) as unknown as AgencyTables;

const docs = seedSpaces(tokens);
const keyOf = (id: string) => (id.startsWith("seed-") ? id.slice(5) : id);
const pageKeys = new Set(docs.map((d) => keyOf(d.id)));
const pageRef = (id: string) => (pageKeys.has(keyOf(id)) ? `page:${keyOf(id)}` : id);

function spans(list: RichSpan[] | undefined): RichSpan[] | undefined {
  return list?.map((s) => (s.link?.startsWith("/spaces/") ? { ...s, link: pageRef(s.link.slice("/spaces/".length)) } : s));
}

function toPack(blocks: SpaceBlock[]): PackBlock[] {
  return blocks.map((b) => {
    let props = b.props;
    if (props && typeof props.spaceId === "string") props = { ...props, spaceId: pageRef(props.spaceId) };
    const src = props?.source as { kind?: string; tableId?: string; viewId?: string } | undefined;
    if (props && src?.kind === "table" && src.tableId?.startsWith("tbl:")) {
      props = { ...props, source: { kind: "template", table: src.tableId.slice(4), ...(src.viewId ? { view: src.viewId.slice(5) } : {}) } };
    }
    const out: PackBlock = { type: b.type };
    const text = spans(b.text);
    if (text?.length) out.text = text;
    if (b.color) out.color = b.color;
    if (b.background) out.background = b.background;
    if (props && Object.keys(props).length) out.props = props;
    if (b.children?.length) out.children = toPack(b.children);
    return out;
  });
}

const root = docs.find((d) => d.id === SEED_ROOT_ID)!;
const ordered = [root, ...docs.filter((d) => d.id !== SEED_ROOT_ID).sort((a, b) => a.position.localeCompare(b.position))];
const pages: PackPage[] = ordered.map((d) => ({
  key: keyOf(d.id),
  parent: d.parentId ? keyOf(d.parentId) : null,
  title: d.title,
  ...(d.icon ? { icon: d.icon } : {}),
  ...(d.cover ? { cover: d.cover } : {}),
  ...(d.id === SEED_ROOT_ID ? { settings: d.settings } : {}),
  blocks: toPack(d.blocks),
}));

const pack: SpaceTemplatePack = {
  packVersion: 1,
  catalogueId: AGENCY_SPEC.catalogueId,
  version: AGENCY_SPEC.version,
  title: "The Traveling SMM™ OS",
  description: "A social-media agency's whole operating system: clients, wins, NPS and team boards.",
  forWho: "Social-media agencies and freelance managers",
  icon: { icon: "TreePalm" },
  cover: SAMPLE_COVER,
  category: "clients",
  tags: ["agency", "social media", "clients", "dashboard"],
  spec: AGENCY_SPEC as unknown as SpaceTemplatePack["spec"],
  pages,
  waivers: [
    { at: "spec.tables (client_win).fields (kind).choiceColors", because: "The reference page draws every win kind in one yellow; the CLIENT WINS ring matches it." },
    { at: "spec.tables (task).fields (kind).choiceColors", because: "Version 3 is installed in organizations already; colours arrive with the next version bump." },
    { at: "spec.tables (task).fields (status).choiceColors", because: "Version 3 is installed in organizations already; colours arrive with the next version bump." },
    { at: "spec.tables", because: "The sample keeps every field internal and no linked-record rule; version 3 is installed already." },
    { at: "spec.forms", because: "The sample's pages carry no form; its tables are added to from the pages." },
    { at: "spec.foundation", because: "Clients are kept as the base every other table hangs off (version 3 as installed)." },
    { at: "spec.tables (task).statusAgrees", because: "A finished task never depends on its client's status in this agency." },
  ],
};

const file = join(PACKS_DIR, "traveling-smm-os.pack.json");
// The pack file was upgraded past the TypeScript sample (v4, 2026-10-17: two-way links, status groups, row
// templates, formulas over rollups). Regenerating would silently drop that work, so a newer file wins: edit
// the JSON, or bring the sample's TypeScript up to it first.
const onDisk = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { version?: number }).version ?? 0 : 0;
if (onDisk > pack.version) {
  console.error(`${file} is version ${onDisk}, newer than the sample's ${pack.version}; refusing to overwrite it. Edit the pack JSON instead.`);
  process.exit(1);
}
writeFileSync(file, JSON.stringify(pack, null, 1) + "\n");
console.log(`wrote ${file}: ${pages.length} pages`);
