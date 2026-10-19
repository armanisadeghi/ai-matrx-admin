// features/spaces/templates/publish.ts — `pnpm spaces:templates:publish [file|dir ...] [--dry]`
//
// THE ONE WAY A PACK FILE BECOMES A SPACES TEMPLATE EVERYONE CAN USE. Each pack is checked first (the same
// checker as spaces:templates:check — a pack with any finding is not sent), then declared for everyone:
// custom.template_declare('platform', …) as the platform administrator, an upsert on (catalog id,
// version) in the system organization's scope — never a person's or a test organization's. The row is the
// records template (card + install plan from the spec, so /make lists it too and it installs through the
// one template_install door) with the pack's pages riding in its spec as `spacePack` and its card face as
// `card.space`. Running it twice changes nothing but `updated_at`.
//
// Signs in with AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD (the package script loads .env and .env.local).
// --dry checks and prints what would be sent, without signing in.

import { relative } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { templateDeclaration, type TemplateSpec } from "@ai-matrx/records/templates";

import { packDeclaration, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";
import { checkPack } from "@/lib/spaces-blocks/template-pack-check";

import { agentSnapshot, packFilesIn, readPack } from "./pack-files";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const files = packFilesIn(args.filter((a) => a !== "--dry"));
  const agents = agentSnapshot();
  const ready: Array<{ name: string; pack: SpaceTemplatePack }> = [];
  for (const file of files) {
    const name = relative(process.cwd(), file);
    const raw = readPack(file);
    const findings = checkPack(raw, { agents });
    if (findings.length) {
      console.log(`SKIP ${name}: ${findings.length} finding(s) — run pnpm spaces:templates:check ${name}`);
      continue;
    }
    ready.push({ name, pack: raw as SpaceTemplatePack });
  }
  if (dry) {
    for (const { name, pack } of ready) {
      const payload = packDeclaration(pack, templateDeclaration(pack.spec as TemplateSpec));
      console.log(`WOULD PUBLISH ${pack.catalogueId} v${pack.version} ${name}: ${pack.pages.length} pages, ${payload.installPlan.steps.length} install steps, ${JSON.stringify(payload).length} bytes`);
    }
    return 0;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.AI_ADMIN_USERNAME;
  const password = process.env.AI_ADMIN_PASSWORD;
  if (!url || !key || !email || !password) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, AI_ADMIN_USERNAME and AI_ADMIN_PASSWORD (run through pnpm spaces:templates:publish).");
    return 2;
  }
  // Publishing for everyone is an admin-lane act: the platform opens it only for requests that say so
  // (platform.admin_lane_open reads the x-matrx-admin-lane header the admin apps send) — as records' publisher does.
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { "x-matrx-admin-lane": "1" } } });
  const signed = await db.auth.signInWithPassword({ email, password });
  if (signed.error) {
    console.error(`Sign-in failed: ${signed.error.message}`);
    return 2;
  }
  let failed = 0;
  for (const { name, pack } of ready) {
    const payload = packDeclaration(pack, templateDeclaration(pack.spec as TemplateSpec));
    const { data, error } = await db.schema("custom").rpc("template_declare", { p_scope: "platform", p_spec: payload });
    if (error) {
      failed++;
      console.log(`REFUSED ${pack.catalogueId} ${name}: ${error.message}`);
      continue;
    }
    const d = data as { template_id: string; version: number; created: boolean; steps: number };
    console.log(`${d.created ? "PUBLISHED" : "UPDATED"} ${pack.catalogueId} v${d.version} ${name} → ${d.template_id} (${d.steps} steps)`);
  }
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error((error as Error).message);
    process.exit(2);
  },
);
