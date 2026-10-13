/**
 * START FROM A LAYOUT (CONTRACTS amendment 2.12): a layout Applet is written as one job + `layout_config`, no
 * code; "Build with AI" carries the chosen job and layout into the builder as references (structured context,
 * never her words), and a malformed seed is dropped rather than trusted.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { attachedJobKeys, attachmentsContext, buildSeedHref, jobReference, layoutReference, readBuildReferences, readBuildSeed } from "./build-references";
import { createLayoutApplet, layoutJson } from "./layout-applet";

jest.mock("./build-applet", () => ({
  slugOf: (raw: string) => raw.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  takenSlugs: async () => new Set<string>(["caption-writer"]),
  slugCandidate: (base: string, attempt: number, taken: ReadonlySet<string>) => (attempt === 0 && !taken.has(base) ? base : `${base}-x${attempt}`),
}));

const ORG = "3e790542-fdaf-40b2-8bf3-658bf94fe67f";
const layout = { kind: "chat" as const, job: "main", options: { title: "Caption writer", accent: "info" as const } };

describe("a layout Applet", () => {
  it("is written with one job and the layout, no files, in the organization given", async () => {
    const inserted: Record<string, unknown>[] = [];
    const client = {
      schema: () => ({
        from: () => ({
          insert: (row: Record<string, unknown>) => {
            inserted.push(row);
            return { select: () => ({ single: async () => ({ data: { id: "a1", slug: row.slug }, error: null }) }) };
          },
        }),
      }),
    } as unknown as SupabaseClient<Database>;
    const made = await createLayoutApplet(client, { organizationId: ORG, name: "Caption writer", jobKey: "applets.run_caption_writer_ab12", layout });
    expect(made).toEqual({ id: "a1", slug: "caption-writer-x0" });
    expect(inserted[0]).toMatchObject({
      organization_id: ORG,
      status: "draft",
      mandates: [{ alias: "main", key: "applets.run_caption_writer_ab12" }],
      layout_config: { kind: "chat", job: "main", options: { title: "Caption writer", accent: "info" } },
    });
    expect(inserted[0]).not.toHaveProperty("files");
    expect(layoutJson({ kind: "form", job: "main" })).toEqual({ kind: "form", job: "main" });
  });
});

describe("Build with AI from a layout", () => {
  const refs = [
    jobReference({ holder: "agent", holderId: "agent-1", label: "Caption writer", jobKey: "applets.run_caption_writer_ab12" }),
    layoutReference("Chat layout", layout),
  ];

  it("carries the job and the layout through the address and back", () => {
    const href = buildSeedHref(refs);
    expect(href.startsWith("/applets/build?seed=")).toBe(true);
    const seed = decodeURIComponent(href.slice("/applets/build?seed=".length));
    expect(readBuildSeed(seed)).toEqual(refs);
    expect(attachedJobKeys(readBuildSeed(seed))).toEqual(["applets.run_caption_writer_ab12"]);
  });

  it("tells the builder the layout as context, never as her words", () => {
    const context = JSON.parse(attachmentsContext(refs) ?? "[]") as Array<Record<string, unknown>>;
    expect(context[1]).toMatchObject({ attached: "Chat layout", what: "stock layout", layout });
  });

  it("drops a malformed seed and a layout without a kind", () => {
    expect(readBuildSeed("not json")).toEqual([]);
    expect(readBuildReferences({ build: { references: [{ id: "layout", kind: "layout", label: "x", layout: { job: "main" } }] } })).toEqual([]);
  });
});
