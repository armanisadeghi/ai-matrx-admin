/**
 * @jest-environment jsdom
 */
import {
  installMovedFunctionList,
  MOVED_FUNCTION_NOTICE_TEXT,
  noticeIfFunctionMoved,
  resetMovedFunctionNotice,
} from "@/lib/diagnostics/movedFunctionNotice";

const info = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { info: (...a: unknown[]) => info(...a) } }));

const missing = { code: "PGRST202", message: "Could not find the function" };

describe("moved-function notice", () => {
  let list: jest.Mock;
  beforeEach(() => {
    info.mockReset();
    resetMovedFunctionNotice();
    list = jest.fn().mockResolvedValue({
      data: [{ function_name: "old_moved_fn", owner_schema: "billing" }],
      error: null,
    });
    installMovedFunctionList(list);
  });

  it("a moved name gives the Reload notice (list fetched once, cached)", async () => {
    expect(await noticeIfFunctionMoved("old_moved_fn", missing)).toBe(true);
    expect(await noticeIfFunctionMoved("old_moved_fn", missing)).toBe(true);
    expect(info).toHaveBeenCalledWith(
      MOVED_FUNCTION_NOTICE_TEXT,
      expect.objectContaining({ action: expect.objectContaining({ label: "Reload" }) }),
    );
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("an unregistered missing name gives no notice", async () => {
    expect(await noticeIfFunctionMoved("never_existed", missing)).toBe(false);
    expect(info).not.toHaveBeenCalled();
  });

  it("other error codes never fetch the list or notice", async () => {
    expect(await noticeIfFunctionMoved("old_moved_fn", { code: "42501" })).toBe(false);
    expect(list).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
