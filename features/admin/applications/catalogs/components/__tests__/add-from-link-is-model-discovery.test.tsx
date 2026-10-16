/**
 * The Catalogs page "Add from link" dialog IS the shared discovery view (<ModelDiscovery> from
 * @ai-matrx/agents/models/react): Search + Paste a link, and a pasted link resolves through the ONE
 * discovery engine (POST /admin/ai-catalog/discovery/resolve) into versions with one Recommended and
 * a Choose each — never the old raw file list with "Use this file", and never the catalog-entry
 * resolver (/catalog-resolver/resolve). Real dialog, real package view; only the HTTP call and the
 * Redux state are stand-ins.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const posted: Array<{ path: string; body: unknown }> = [];
jest.mock("@/lib/api/post-json-as-user", () => ({
  postJsonAsUser: async ({ path, body }: { path: string; body: unknown }) => {
    posted.push({ path, body });
    if (path === "/admin/ai-catalog/discovery/resolve") {
      return {
        id: "c1",
        repo: "google/gemma-4-31B-it",
        revision: "abc",
        state: "checked",
        origin: "admin_manual",
        model_id: null,
        updated_at: "2026-10-16T00:00:00Z",
        suggested: {
          repo: "google/gemma-4-31B-it",
          revision: "abc",
          maker: "Google",
          media: [],
          ambiguities: [],
          recommended_variant_key: "q4_k_m",
          variants: [
            { key: "q4_k_m", format: "gguf", quant: "Q4_K_M", total_bytes: 18 * 2 ** 30, memory_bytes_min: 20 * 2 ** 30, artifacts: [{ role: "weights", path_in_repo: "g-Q4_K_M.gguf", url: "u1", size_bytes: 1, required_for: ["core"] }] },
            { key: "q8_0", format: "gguf", quant: "Q8_0", total_bytes: 32 * 2 ** 30, memory_bytes_min: 34 * 2 ** 30, artifacts: [{ role: "weights", path_in_repo: "g-Q8_0.gguf", url: "u2", size_bytes: 1, required_for: ["core"] }] },
          ],
        },
      };
    }
    throw Object.assign(new Error("not found"), { status: 404 });
  },
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector({}),
  useAppDispatch: () => () => {},
}));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectAccessToken: () => "token" }));
jest.mock("@/lib/redux/slices/apiConfigSlice", () => ({ selectResolvedBaseUrl: () => "https://server.test" }));
jest.mock("@/lib/api/useServerOrganizationId", () => ({ useServerOrganizationId: () => "org-1" }));

import { AddFromLinkDialog } from "../AddFromLinkDialog";

function setInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Catalogs Add from link", () => {
  it("renders <ModelDiscovery>: a pasted link shows versions with one Recommended, no file list", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<AddFromLinkDialog open onOpenChange={() => {}} />);
    });
    const dialog = document.body;
    expect(dialog.querySelector('[data-testid="model-discovery"]')).not.toBeNull();
    expect(dialog.textContent).toContain("Paste a link");
    expect(dialog.textContent).not.toContain("Use this file");
    expect(dialog.textContent).not.toContain("Kind hint");

    const tab = Array.from(dialog.querySelectorAll("button,[role=tab]")).find((b) => b.textContent === "Paste a link") as HTMLElement;
    await act(async () => tab.click());
    const field = dialog.querySelector('input[aria-label="Model link"]') as HTMLInputElement;
    await act(async () => setInput(field, "https://huggingface.co/google/gemma-4-31B-it"));
    const find = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Find versions")!;
    await act(async () => {
      find.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(posted.map((p) => p.path)).toContain("/admin/ai-catalog/discovery/resolve");
    expect(posted.some((p) => p.path.includes("catalog-resolver"))).toBe(false);
    const rows = dialog.querySelectorAll('[data-testid="discovery-variant"]');
    expect(rows).toHaveLength(2);
    expect(dialog.querySelectorAll('[data-recommended="true"]')).toHaveLength(1);
    expect(Array.from(dialog.querySelectorAll("button")).filter((b) => b.textContent === "Add this version")).toHaveLength(2);
    expect(dialog.textContent).not.toContain("g-Q4_K_M.gguf");
    await act(async () => root.unmount());
  });
});
