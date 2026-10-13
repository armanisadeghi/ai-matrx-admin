// features/applets-host/builder/layout-applet.ts — A NO-CODE APPLET: ONE JOB + A STOCK LAYOUT + ITS OPTIONS.
//
// The restored "pick a layout, no code" path (CONTRACTS amendment 2.12; the agent-apps shells and template modes
// deleted on 2026-10-07). It makes the Applet record directly — `mandates: [{ alias: "main", key }]` and
// `layout_config` — with no files and no AI: the host mounts the declared layout (`@ai-matrx/applets`
// `StockLayout`). Only the code path (Build with AI) uses the builder.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppletLayout } from "@ai-matrx/applets";

import type { Database, Json } from "@/types/database.types";
import { slugCandidate, slugOf, takenSlugs } from "./build-applet";

type Client = SupabaseClient<Database>;

/** The job alias every layout Applet runs its job under. */
export const LAYOUT_JOB_ALIAS = "main";

/** The layout as the stored JSON (`app.definition.layout_config`). */
export function layoutJson(layout: AppletLayout): Json {
  const out: { [key: string]: Json } = { kind: layout.kind, job: layout.job };
  if (layout.options) out.options = JSON.parse(JSON.stringify(layout.options)) as Json;
  return out;
}

export interface LayoutAppletInput {
  organizationId: string;
  name: string;
  description?: string | null;
  jobKey: string;
  layout: AppletLayout;
}

/** Make the Applet as her, in her active organization. Answers its id and address. */
export async function createLayoutApplet(client: Client, input: LayoutAppletInput): Promise<{ id: string; slug: string }> {
  const name = input.name.trim() || "Untitled Applet";
  const base = slugOf(name);
  const taken = await takenSlugs(client, base, null);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = slugCandidate(base, attempt, taken);
    const { data, error } = await client
      .schema("app")
      .from("definition")
      .insert({
        organization_id: input.organizationId,
        slug,
        name,
        description: input.description?.trim() || null,
        status: "draft",
        mandates: [{ alias: LAYOUT_JOB_ALIAS, key: input.jobKey }],
        layout_config: layoutJson(input.layout),
      })
      .select("id, slug")
      .single();
    if (!error && data) return { id: data.id, slug: data.slug };
    if (error?.code !== "23505") throw new Error(error?.message ?? "Could not make the Applet.");
    taken.add(slug);
  }
  throw new Error("Could not make the Applet — try again.");
}
