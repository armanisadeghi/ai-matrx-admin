/**
 * The admin MANAGEMENT pages read a mandate by key with the SYSTEM org filter.
 * A key that names an organization's or a person's mandate used to come back
 * empty and read "No mandate is registered" about a row that exists
 * (shortcut.create_gemini_image.matrx_user_notes, 2026-10-10). The hook must
 * answer "not-a-system-mandate" with that row's id (the support door), and
 * "no-such-mandate" only when no row carries the key at all.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { withClaims } from "@/test-utils/supabase-auth";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";

const TENANT_ROW_ID = "ff585c9e-2ceb-4345-a053-f8cce001d498";
let tenantRows: Array<{ id: string }> = [];

function chain(table: string) {
  const state: { orgFilter?: string } = {};
  const q: Record<string, unknown> = {};
  const self = () => q;
  for (const m of ["select", "is", "order"]) q[m] = self;
  q.eq = (col: string, val: string) => {
    if (col === "organization_id") state.orgFilter = val;
    return q;
  };
  q.limit = async () => ({
    data:
      table === "definition" && state.orgFilter === SYSTEM_ORGANIZATION_ID
        ? []
        : table === "definition"
          ? tenantRows
          : [],
    error: null,
  });
  return q;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: withClaims({
      getUser: async () => ({ data: { user: { id: "u1" } }, error: null }),
    }),
    schema: () => ({ from: (t: string) => chain(t) }),
    from: (t: string) => chain(t),
  }),
}));
jest.mock("@/lib/supabase/mandateStorage", () => ({
  mandateDefinitions: (c: { schema: (s: string) => { from: (t: string) => unknown } }) =>
    c.schema("mandate").from("definition"),
  mandateBindings: (c: { schema: (s: string) => { from: (t: string) => unknown } }) =>
    c.schema("mandate").from("binding"),
}));

import { useMandateWorkspaceData } from "../useMandateWorkspaceData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function verdict(key: string) {
  let latest: ReturnType<typeof useMandateWorkspaceData> | null = null;
  function Probe() {
    latest = useMandateWorkspaceData(key, { systemOnly: true });
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(<Probe />);
  });
  for (let i = 0; i < 20 && (latest as never as { loading: boolean }).loading; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  const out = latest as unknown as ReturnType<typeof useMandateWorkspaceData>;
  await act(async () => root.unmount());
  return out;
}

describe("system-only key lookup", () => {
  it("a tenant mandate's key yields not-a-system-mandate with its id", async () => {
    tenantRows = [{ id: TENANT_ROW_ID }];
    const r = await verdict("shortcut.create_gemini_image.matrx_user_notes");
    expect(r.failure?.kind).toBe("not-a-system-mandate");
    expect((r.failure as { mandateId?: string }).mandateId).toBe(TENANT_ROW_ID);
  });

  it("a key nothing carries is still no-such-mandate", async () => {
    tenantRows = [];
    const r = await verdict("zzz.nothing_here");
    expect(r.failure?.kind).toBe("no-such-mandate");
  });
});
