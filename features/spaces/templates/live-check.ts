// features/spaces/templates/live-check.ts — `pnpm spaces:templates:live` — the publish guard.
//
// Every pack file on main must be live at the same version: a pack edited and merged but never published leaves
// the gallery showing the old template (2026-10-21: a 124-pack fix sat on main, live still had the old lists).
// Reads the public catalog (RPC templates_public, platform scope, paged by 50) and compares each pack file's
// version with the live row of its spec id. Exit 0 = every pack is live at its file's version; 1 = some are
// behind (listed, with the publish command); 2 = could not read.

import { relative } from "node:path";

import { packFilesIn, readPack } from "./pack-files";

type Card = { slug?: string; name?: string; version?: number };

async function liveVersions(): Promise<Map<string, number>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set (run through the pnpm script, which loads .env and .env.local).");
  const out = new Map<string, number>();
  for (let offset = 0; ; offset += 50) {
    const res = await fetch(`${url}/rest/v1/rpc/templates_public`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "public" },
      body: JSON.stringify({ p_filter: { scope: "platform", limit: 50, offset, thumb: true } }),
    });
    if (!res.ok) throw new Error(`templates_public answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { cards?: Card[]; total?: number };
    const cards = body.cards ?? [];
    for (const c of cards) if (c.slug && typeof c.version === "number") out.set(c.slug, Math.max(out.get(c.slug) ?? 0, c.version));
    if (!cards.length || offset + cards.length >= (body.total ?? 0)) break;
  }
  return out;
}

async function main(): Promise<number> {
  let live: Map<string, number>;
  try {
    live = await liveVersions();
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }
  const behind: string[] = [];
  const files = packFilesIn(process.argv.slice(2));
  for (const file of files) {
    const p = readPack(file) as { catalogueId?: string; version?: number; spec?: { id?: string } };
    const id = p.spec?.id ?? "";
    const have = live.get(id);
    if (have !== p.version) behind.push(`${relative(process.cwd(), file)} (${p.catalogueId}): file v${p.version}, live ${have === undefined ? "missing" : `v${have}`}`);
  }
  if (behind.length) {
    console.error(`${behind.length} of ${files.length} pack(s) are not live at their file's version:\n${behind.map((b) => `  ${b}`).join("\n")}\nPublish each: pnpm spaces:templates:publish <file> (retry "fetch failed").`);
    return 1;
  }
  console.log(`${files.length} of ${files.length} pack(s) are live at their file's version.`);
  return 0;
}

main().then((code) => process.exit(code));
