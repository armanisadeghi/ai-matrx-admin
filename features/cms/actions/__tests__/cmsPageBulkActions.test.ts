/**
 * The CMS page menu's mutating verbs (Publish pending draft, Move to Trash) have bulk twins
 * that call the SAME service doors as the row menu; a page with no saved draft is skipped and
 * named, never silently dropped.
 */
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
const publishDraft = jest.fn(async (_id: string) => ({}));
const unpublishPage = jest.fn(async (_id: string) => ({}));
const deletePage = jest.fn(async (_id: string) => undefined);
jest.mock("@/features/cms/services/cmsService", () => ({
  CmsPageService: {
    publishDraft: (id: string) => publishDraft(id),
    unpublishPage: (id: string) => unpublishPage(id),
    deletePage: (id: string) => deletePage(id),
  },
}));

import { CMS_PAGE_BULK_ACTIONS } from "../cmsPageBulkActions";
import type { ClientPageSummary } from "@/features/cms/types";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";

const page = (id: string, has_draft: boolean, is_published = true) => ({ id, title: `Page ${id}`, has_draft, is_published }) as unknown as ClientPageSummary;
const rows = [page("a", true), page("b", false), page("c", true)];
const sel: EntityBulkSelection<ClientPageSummary> = {
  mode: "ids",
  ids: rows.map((r) => r.id),
  rows,
  count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
};

beforeEach(() => jest.clearAllMocks());

describe("CMS page bulk twins", () => {
  it("offers Publish drafts, Unpublish and Move to Trash", () => {
    expect(CMS_PAGE_BULK_ACTIONS.map((a) => a.id)).toEqual(["publish-draft", "unpublish", "delete"]);
    expect(CMS_PAGE_BULK_ACTIONS[2].variant).toBe("destructive");
  });

  it("publish runs the row door for pages with a draft and names the one without", async () => {
    const publish = CMS_PAGE_BULK_ACTIONS[0];
    await publish.run(sel, {});
    expect(publishDraft.mock.calls.map((c) => c[0]).sort()).toEqual(["a", "c"]);
    expect(warning).toHaveBeenCalledWith("1 page skipped", { description: "Page b: No saved draft to publish" });
  });

  it("Move to Trash names the count and runs deletePage per page", async () => {
    const trash = CMS_PAGE_BULK_ACTIONS[2];
    expect(trash.confirm?.(sel)?.title).toBe("Move 3 pages to Trash?");
    await trash.run(sel, {});
    expect(deletePage).toHaveBeenCalledTimes(3);
  });

  it("Unpublish runs the row door per live page and names the one already offline", async () => {
    const unpublish = CMS_PAGE_BULK_ACTIONS[1];
    const mixed = [page("a", true), page("b", false, false), page("c", true)];
    const msel = { ...sel, ids: mixed.map((r) => r.id), rows: mixed, count: 3 };
    expect(unpublish.confirm?.(msel)?.title).toBe("Unpublish 3 pages?");
    await unpublish.run(msel, {});
    expect(unpublishPage.mock.calls.map((c) => c[0]).sort()).toEqual(["a", "c"]);
    expect(warning).toHaveBeenCalledWith("1 page skipped", { description: "Page b: Not published" });
  });
});
