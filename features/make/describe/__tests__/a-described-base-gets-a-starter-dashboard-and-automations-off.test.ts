// features/make/describe/__tests__/a-described-base-gets-a-starter-dashboard-and-automations-off.test.ts — lane AT-AIBASE.
//
// THE USE CASE. A dog groomer typed their request into /make; this is the describe mandate's v8 live answer for it
// (fixture v8-live-outputs-2026-10-09.json, "dog-grooming", built into an organization with no tables of its own). Airtable's "Create base with AI" hands back tables AND an interface AND suggested
// automations. The box now declares the base with a starter dashboard and suggested automations (switched off) worked out
// from the designed tables, and says each one in the notes. If the store refuses the starter, the tables still land.
//
// BREAKS THIS CATCHES: the starter never reaching the declaration · a suggested automation without its switch-off flag ·
// a refused starter sinking the whole setup · a refused starter left unsaid.

import { describe, expect, it } from "@jest/globals";

import { declareWithStarter, readDesign } from "../describeTemplate";
import live from "./fixtures/v8-live-outputs-2026-10-09.json";

const ORG = "11111111-1111-4111-8111-111111111111";

/** A supabase-js stand-in that records each template_declare and answers (or refuses) it. */
function fakeClient(refuseFirst: boolean) {
  const declared: Array<Record<string, unknown>> = [];
  const client = {
    schema: () => ({
      rpc: async (fn: string, args: { p_spec: Record<string, unknown> }) => {
        expect(fn).toBe("template_declare");
        declared.push(args.p_spec);
        if (refuseFirst && declared.length === 1) return { data: null, error: { message: "The starter was refused here." } };
        return { data: { template_id: `t-${declared.length}` }, error: null };
      },
    }),
  };
  return { client, declared };
}

describe("a described base gets a starter dashboard and suggested automations", () => {
  const { checked } = readDesign((live as unknown as Record<string, unknown>)["dog-grooming"], []);

  it("declares the base with one dashboard and switched-off automations, each named in the notes", async () => {
    const { client, declared } = fakeClient(false);
    const out = await declareWithStarter(client as never, ORG, checked.spec, "stamp-1");
    expect(out.templateId).toBe("t-1");
    const extras = (declared[0]!.extras ?? []) as Array<{ kind: string; startsOff?: boolean; name: string }>;
    expect(extras.filter((e) => e.kind === "dashboard")).toHaveLength(1);
    const automations = extras.filter((e) => e.kind === "automation");
    expect(automations.length).toBeGreaterThan(0);
    for (const a of automations) expect(a.startsOff).toBe(true);
    expect(out.notes.some((n) => n.startsWith("Dashboard "))).toBe(true);
    for (const a of automations) expect(out.notes).toContain(`Suggested automation (off until you switch it on): ${a.name}.`);
  });

  it("a refused starter never sinks the setup: the tables land and the note says why", async () => {
    const { client, declared } = fakeClient(true);
    const out = await declareWithStarter(client as never, ORG, checked.spec, "stamp-2");
    expect(out.templateId).toBe("t-2");
    expect(((declared[1]!.extras ?? []) as Array<{ kind: string }>).some((e) => e.kind === "dashboard")).toBe(false);
    expect(out.notes).toEqual(["Starter dashboard and suggested automations: not made — The starter was refused here."]);
  });
});
