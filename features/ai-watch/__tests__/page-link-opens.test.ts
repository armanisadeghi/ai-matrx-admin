/**
 * Guard (U9): `?panels=ai-watch:page`, the documented link to Watch AI, opens the page's one window.
 * Before, the hydrator returned for the bare `page` id, so the link did nothing and said nothing.
 */
import { hydrate } from "@/features/overlays/definitions/aiWatchWindow.link";
import { AI_WATCH_PAGE_INSTANCE } from "@/features/overlays/definitions/aiWatchWindow.overlay";

const ctx = (id: string) => {
  const dispatch = jest.fn();
  return { dispatch, ctx: { dispatch, id, open: jest.fn() } as unknown as Parameters<typeof hydrate>[0] };
};

describe("the Watch AI page link", () => {
  it("opens the page window for `ai-watch:page`", () => {
    const { dispatch, ctx: c } = ctx("page");
    hydrate(c);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(dispatch.mock.calls[0][0])).toContain(AI_WATCH_PAGE_INSTANCE);
  });

  it("still opens a call link and ignores junk", () => {
    const call = ctx("u-123");
    hydrate(call.ctx);
    expect(call.dispatch).toHaveBeenCalledTimes(1);
    const junk = ctx("zzz");
    hydrate(junk.ctx);
    expect(junk.dispatch).not.toHaveBeenCalled();
  });
});
