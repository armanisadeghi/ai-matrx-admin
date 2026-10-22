// The class progress hooks report loading ONLY while a read that will actually
// run is unfinished: a missing user id (or a disabled read) never leaves the
// hook stuck in "loading", which the class hub scope would report forever.

import { renderHook, settle } from "@/test-utils/renderHook";
import {
  getClassProgressOverview,
  getClassStudentProgress,
} from "../service";
import {
  useClassProgressOverview,
  useMyClassProgress,
} from "../hooks/useClassProgress";

let userId: string | null = null;

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => userId,
}));

jest.mock("../service", () => ({
  getClassProgressOverview: jest.fn(),
  getClassStudentProgress: jest.fn(),
}));

const studentProgress = getClassStudentProgress as jest.Mock;
const overviewRead = getClassProgressOverview as jest.Mock;

describe("useMyClassProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userId = null;
  });

  it("is not loading and reads nothing while there is no user id", async () => {
    const hook = await renderHook(() => useMyClassProgress("class-1"));
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(studentProgress).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it("is not loading when disabled", async () => {
    userId = "user-1";
    const hook = await renderHook(() => useMyClassProgress("class-1", false));
    expect(hook.current.loading).toBe(false);
    expect(studentProgress).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it("loads once a user id is present, then settles", async () => {
    userId = "user-1";
    studentProgress.mockResolvedValue([
      { token: "fc_set", resourceId: "d1", status: "completed", scorePct: 90 },
    ]);
    const hook = await renderHook(() => useMyClassProgress("class-1"));
    await settle(hook, (v) => !v.loading, "progress loaded");
    expect(studentProgress).toHaveBeenCalledWith("class-1", "user-1");
    expect(hook.current.progress).toHaveLength(1);
    expect(hook.current.error).toBeNull();
    await hook.unmount();
  });

  it("settles with the error on a failed read", async () => {
    userId = "user-1";
    studentProgress.mockRejectedValue(new Error("timeout"));
    const hook = await renderHook(() => useMyClassProgress("class-1"));
    await settle(hook, (v) => !v.loading, "progress failed");
    expect(hook.current.error).toBe("timeout");
    await hook.unmount();
  });
});

describe("useClassProgressOverview", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is not loading when disabled or without a class", async () => {
    const off = await renderHook(() => useClassProgressOverview("class-1", false));
    expect(off.current.loading).toBe(false);
    await off.unmount();
    const none = await renderHook(() => useClassProgressOverview(null));
    expect(none.current.loading).toBe(false);
    await none.unmount();
    expect(overviewRead).not.toHaveBeenCalled();
  });

  it("loads and settles with the overview", async () => {
    overviewRead.mockResolvedValue({ students: [] });
    const hook = await renderHook(() => useClassProgressOverview("class-1"));
    await settle(hook, (v) => !v.loading, "overview loaded");
    expect(hook.current.overview).toEqual({ students: [] });
    await hook.unmount();
  });
});
