/**
 * "One editor" (Arman): a MODEL kind on Applications › Catalogs lists the unified catalog (ai.*)
 * through THE shared query and order — fetchCuratedModels + curatedList (@ai-matrx/agents/models) —
 * so its offered rows are exactly Matrx 2's list for that kind, in Matrx 2's order. The old
 * catalog_entries rows stay viewable, read-only. Real table, real package functions; only the
 * database client and Redux are stand-ins.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { curatedList, fetchCuratedModels, type CuratedCatalogClient } from "@ai-matrx/agents/models";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector({}),
  useAppDispatch: () => () => {},
}));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectAccessToken: () => "token" }));
jest.mock("@/lib/redux/slices/apiConfigSlice", () => ({ selectResolvedBaseUrl: () => "https://server.test" }));
jest.mock("@/lib/api/useServerOrganizationId", () => ({ useServerOrganizationId: () => "org-1" }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => { throw new Error("the test passes its own client"); } }));
jest.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));

import { UnifiedModelKindTable, kindOfModel } from "../UnifiedModelKindTable";

const tables: Record<string, Record<string, unknown>[]> = {
  model_definition: [
    { id: "m-zeta", name: "zeta", common_name: "Zeta 8B", capabilities: { input: ["text"], output: ["text"] } },
    { id: "m-alpha", name: "alpha", common_name: "Alpha 4B", capabilities: { input: ["text"], output: ["text"] } },
    { id: "m-mid", name: "mid", common_name: "Mid 12B", capabilities: { input: ["text"], output: ["text"] } },
    { id: "m-off", name: "beta", common_name: "Beta 2B", capabilities: { input: ["text"], output: ["text"] } },
    { id: "m-whisper", name: "whisper", common_name: "Whisper", capabilities: { input: ["audio"], output: ["text"] } },
  ],
  model_variant: [
    { id: "v1", model_id: "m-zeta", key: "q4", quant: "Q4_K_M", review_state: "offered", metadata: { catalog_entry_ids: ["e-zeta"] } },
    { id: "v2", model_id: "m-alpha", key: "q4", quant: "Q4_K_M", review_state: "offered" },
    { id: "v3", model_id: "m-mid", key: "q4", quant: "Q4_K_M", review_state: "offered" },
    { id: "v4", model_id: "m-off", key: "q4", quant: "Q4_K_M", review_state: "files_checked" },
    { id: "v5", model_id: "m-whisper", key: "ggml", quant: "", review_state: "offered", metadata: { catalog_entry_ids: ["e-w"] } },
  ],
  model_presentation: [
    { model_id: "m-zeta", display_order: 1, page: "text", shelf: "s", shelf_title: "S" },
    { model_id: "m-mid", display_order: 2, page: "text", shelf: "s", shelf_title: "S" },
    { model_id: "m-off", display_order: 0, page: "text", shelf: "s", shelf_title: "S" },
  ],
  provider: [],
};
const client: CuratedCatalogClient = { schema: () => ({ from: (t: string) => ({ select: async () => ({ data: tables[t] ?? [], error: null }) }) }) };
const entries = [
  { id: "e-zeta", kind: "llm_model", app: "matrx-local", key: "zeta", payload: { name: "Zeta (old)" }, is_active: true, sort_order: 0 },
  { id: "e-w", kind: "whisper_model", app: "matrx-local", key: "w", payload: { name: "W" }, is_active: true, sort_order: 0 },
] as any[];

async function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <UnifiedModelKindTable
        app="matrx-local"
        kind="llm_model"
        allEntries={entries}
        client={client}
        onBack={() => {}}
        onAddFromLink={() => {}}
        oldList={<div>OLD ROWS: Zeta (old)</div>}
      />,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return { host, root };
}

const names = (host: HTMLElement) => Array.from(host.querySelectorAll("tbody tr")).map((tr) => tr.textContent ?? "");

describe("Catalogs model kinds are the one catalog", () => {
  it("lists the kind in the one order; its offered rows are exactly Matrx 2's list", async () => {
    const { host, root } = await mount();
    const shown = names(host);
    const all = await fetchCuratedModels(client);
    const llm = (offeredOnly: boolean) => curatedList(all, { offeredOnly }).filter((m) => kindOfModel(m, new Map(entries.map((e) => [e.id, e.kind]))) === "llm_model");
    const expected = llm(false).map((m) => m.common_name!);
    // Same members and order as the shared list (Beta first by display_order 0, then Zeta, Mid, Alpha unordered).
    expect(shown.map((t) => expected.find((n) => t.includes(n)))).toEqual(expected);
    expect(expected).toEqual(["Beta 2B", "Zeta 8B", "Mid 12B", "Alpha 4B"]);
    // The page's offered rows === Matrx 2's list for this kind.
    const offeredShown = shown.filter((t) => t.includes("Offered") && !t.includes("Not offered")).map((t) => expected.find((n) => t.includes(n)));
    expect(offeredShown).toEqual(llm(true).map((m) => m.common_name));
    expect(shown.some((t) => t.includes("Whisper"))).toBe(false);
    await act(async () => root.unmount());
  });

  it("keeps the old rows viewable, read-only", async () => {
    const { host, root } = await mount();
    const toggle = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Old list (read-only)"))!;
    await act(async () => toggle.click());
    expect(host.querySelector('[data-testid="old-list-read-only"]')?.textContent).toContain("OLD ROWS: Zeta (old)");
    await act(async () => root.unmount());
  });
});
