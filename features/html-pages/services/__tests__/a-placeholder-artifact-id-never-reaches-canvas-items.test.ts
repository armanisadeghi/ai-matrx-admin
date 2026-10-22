/**
 * Defect 88 (Q-19, live 2026-10-21): 22P02 on canvas.canvas_items for `artifact-0`.
 *
 * The splitter names an `<artifact>` with no id `artifact-<n>` (a local placeholder, not a row).
 * HtmlArtifact handed it to HtmlInlinePreview, which read canvas.canvas_items `.eq("id", ...)` and
 * Postgres refused the non-uuid. Every canvas row reader must skip a non-uuid id (no row exists yet).
 */
const from = jest.fn();
const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ from }), rpc, from, auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: "t" } }, error: null }) } },
}));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "00000000-0000-4000-8000-000000000001" }));
jest.mock("@/lib/api/call-api", () => ({ callApi: jest.fn() }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStore: () => null }));

import { resolveHtmlCanvasPage } from "../canvasVersionPage";
import { canvasArtifactService } from "@/features/canvas/services/canvasArtifactService";
import { canvasItemsService } from "@/features/canvas/services/canvasItemsService";

describe("a placeholder artifact id (artifact-0) never reaches canvas.canvas_items", () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it("resolveHtmlCanvasPage reads nothing and finds no page", async () => {
    await expect(resolveHtmlCanvasPage("artifact-0", "self")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("canvasArtifactService.getById reads nothing and finds no row", async () => {
    await expect(canvasArtifactService.getById("artifact-0")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("canvasArtifactService.getVersionHistory has no versions and asks nothing", async () => {
    await expect(canvasArtifactService.getVersionHistory("artifact-0")).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("canvasItemsService.getById finds no row and asks nothing", async () => {
    const answer = await canvasItemsService.getById("artifact-0");
    expect(answer.data).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
