/**
 * The touched-topics memory (a topic an agent just archived can still be
 * restored by id after it leaves the visible list) belongs to ONE mounted
 * page: two pages never share it, and unmounting the page forgets it, so it
 * cannot survive a route change or a sign-out/in.
 */
import { renderHook } from "@/test-utils/renderHook";
import {
  createResearchTopicsSurface,
  useResearchTopicsSurface,
} from "../surface";
import type { SurfaceWriteHandlerEntry } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { EntityListSurface } from "@/lib/entity-list/components/EntityListPage";
import type { ResearchTopicListRow } from "../types";

jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));
jest.mock("../actions", () => ({
  archiveTopic: jest.fn(async () => undefined),
  restoreTopic: jest.fn(async () => undefined),
}));
jest.mock("../../service", () => ({
  createTopic: jest.fn(),
  updateTopic: jest.fn(),
  updateTopicMeta: jest.fn(),
}));

const topic: ResearchTopicListRow = {
  id: "t-1",
  name: "Battery supply chain",
  description: null,
  status: "draft",
  autonomy_level: "semi",
  organization_id: "org-1",
  organization_name: "Acme Energy",
  created_by: "user-1",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-02T00:00:00Z",
  template_id: "",
  project_id: "",
  project_name: "",
  archived_at: "",
  custom_fields: {},
} as unknown as ResearchTopicListRow;

type Surface = EntityListSurface<ResearchTopicListRow>;

/** A list controller whose rows can change, as after an archive refresh. */
function makeList() {
  const state = { rows: [topic] as ResearchTopicListRow[] };
  const list = {
    get rows() {
      return state.rows;
    },
    removeRow: (id: string) => {
      state.rows = state.rows.filter((r) => r.id !== id);
    },
    refresh: jest.fn(),
    patchQuery: jest.fn(),
    query: {},
  };
  return list as unknown as Parameters<NonNullable<Surface["getWriteHandlers"]>>[0];
}

const handlers = (surface: Surface, list: ReturnType<typeof makeList>) =>
  surface.getWriteHandlers!(list) as Record<string, SurfaceWriteHandlerEntry>;

async function archiveThenRestorable(surface: Surface): Promise<() => void> {
  const list = makeList();
  const h = handlers(surface, list);
  await h.delete_topics.apply(["t-1"]);
  expect(list.rows).toHaveLength(0);
  return () => h.update_topics.validate!([{ id: "t-1", archived: false }]);
}

describe("touched topics are scoped to the mounted page", () => {
  it("lets the same page restore a topic it just archived", async () => {
    const restore = await archiveThenRestorable(createResearchTopicsSurface(new Map()));
    expect(restore).not.toThrow();
  });

  it("never shares the memory between two pages", async () => {
    await archiveThenRestorable(createResearchTopicsSurface(new Map()));
    const other = createResearchTopicsSurface(new Map());
    // Gone from the other page's rows too, and the other page never touched it.
    const emptyList = makeList();
    emptyList.removeRow("t-1");
    expect(() =>
      handlers(other, emptyList).update_topics.validate!([{ id: "t-1", archived: false }]),
    ).toThrow();
  });

  it("forgets every touched topic when the page unmounts", async () => {
    const hook = await renderHook(() => useResearchTopicsSurface());
    const surface = hook.current;
    const restore = await archiveThenRestorable(surface);
    expect(restore).not.toThrow();
    await hook.unmount();
    expect(restore).toThrow();
  });

});
