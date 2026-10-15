import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { assessFreshness } from "@/lib/dev-server/server-freshness";

/**
 * GET /api/dev/server-freshness — DEVELOPMENT ONLY (404 in every build).
 *
 * Says whether this dev server is still running the @ai-matrx packages on disk.
 * Read by the super-admin attention dock (`features/admin/attention/sources/
 * useDevServerFreshnessSource.ts`); contract in `lib/dev-server/server-freshness.ts`.
 * Imports nothing from our own packages on purpose: it must answer on the very
 * server whose package graph went stale.
 */
export const dynamic = "force-dynamic";

async function diskPackages(root: string): Promise<Map<string, string>> {
  const scope = join(root, "node_modules", "@ai-matrx");
  const out = new Map<string, string>();
  const names = await readdir(scope).catch(() => [] as string[]);
  await Promise.all(
    names.map(async (name) => {
      try {
        const pkg = JSON.parse(await readFile(join(scope, name, "package.json"), "utf8")) as { version?: unknown };
        out.set(`@ai-matrx/${name}`, typeof pkg.version === "string" ? pkg.version : "unknown");
      } catch {
        // Mid-relink: the directory is listed but its package.json is not there yet. Absent
        // here means "moved" in the diff, which is the truth while an install runs.
      }
    }),
  );
  return out;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  const root = process.cwd();
  const modulesYaml = await stat(join(root, "node_modules", ".modules.yaml")).catch(() => null);
  return NextResponse.json(
    assessFreshness({
      bootedAtMs: Date.now() - process.uptime() * 1000,
      installedAtMs: modulesYaml ? modulesYaml.mtimeMs : null,
      bootPackages: process.env.MATRX_PREVIEW_BOOT_PACKAGES,
      diskPackages: await diskPackages(root),
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
