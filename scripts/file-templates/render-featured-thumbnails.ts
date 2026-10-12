/**
 * Renders and stores the thumbnails of the featured (Matrx System) templates
 * that lack one: the snapshot miniature (the same renderer the app uses)
 * rasterised by headless Chromium, uploaded through the files service as a
 * web-published file, its id written to workbench.file_template.
 *
 *   tsx --tsconfig tsconfig.json scripts/file-templates/render-featured-thumbnails.ts [--all]
 *
 * Featured templates are platform content; a person's own templates get their
 * thumbnail in the app at "Save as template".
 */
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadDbEnvFrom } from "../lib/direct-db-env";
import { SYSTEM_ORGANIZATION_ID } from "@/features/templates/files/types";
import { THUMB_HEIGHT, THUMB_WIDTH, snapshotPreviewSvg } from "@/features/templates/files/thumbnail/snapshot-preview-svg";

const FILES_URL = process.env.NEXT_PUBLIC_FILES_URL ?? "https://files.matrxserver.com";

function envFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]!] = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
  }
  return out;
}

async function main() {
  const all = process.argv.includes("--all");
  const local = { ...envFile(resolve(".env.local")), ...process.env } as Record<string, string>;
  const sb = createClient(local.NEXT_PUBLIC_SUPABASE_URL, local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const signed = await sb.auth.signInWithPassword({ email: local.AI_ADMIN_USERNAME, password: local.AI_ADMIN_PASSWORD });
  if (signed.error || !signed.data.session) throw new Error(`sign-in failed: ${signed.error?.message}`);
  const token = signed.data.session.access_token;
  const userId = signed.data.user.id;

  const env = loadDbEnvFrom(resolve("."));
  if ("missing" in env) throw new Error(`direct-DB variables missing: ${env.missing.join(", ")}`);
  const db = new pg.Client({ user: env.user, password: env.password, host: env.host, port: env.port, database: env.database, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const browser = await chromium.launch({ headless: true });
  try {
    const org = await db.query(
      `select m.organization_id as org from iam.memberships m
        where m.user_id = $1 and m.organization_id <> $2 order by m.created_at limit 1`,
      [userId, SYSTEM_ORGANIZATION_ID],
    );
    const orgId: string = org.rows[0]?.org;
    if (!orgId) throw new Error("the uploading account has no organization");
    const rows = await db.query(
      `select id, kind, name, snapshot from workbench.file_template
        where organization_id = $1 and deleted_at is null ${all ? "" : "and thumbnail_file_id is null"} order by kind, sort_order`,
      [SYSTEM_ORGANIZATION_ID],
    );
    const page = await browser.newPage({ viewport: { width: THUMB_WIDTH, height: THUMB_HEIGHT }, deviceScaleFactor: 2 });
    for (const r of rows.rows) {
      const svg = snapshotPreviewSvg(r.kind, r.snapshot);
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: THUMB_WIDTH, height: THUMB_HEIGHT } });
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), `template-${r.id}.png`);
      form.append("file_path", `Template thumbnails/template-${r.id}.png`);
      form.append("published_to_web", "true");
      form.append("metadata_json", JSON.stringify({ purpose: "file_template_thumbnail", template_id: r.id }));
      const res = await fetch(`${FILES_URL}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "X-Organization-Id": orgId },
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { file_id?: string; id?: string; file?: { id?: string } };
      const fileId = body.file_id ?? body.id ?? body.file?.id;
      if (!res.ok || !fileId) throw new Error(`upload failed for ${r.name}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
      await db.query(`update workbench.file_template set thumbnail_file_id = $2 where id = $1`, [r.id, fileId]);
      console.log(`  ${r.kind.padEnd(8)} ${r.name.padEnd(22)} → ${fileId}`);
    }
    console.log(`[thumbnails] ${rows.rows.length} stored`);
  } finally {
    await browser.close();
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
