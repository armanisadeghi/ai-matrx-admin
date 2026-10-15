/**
 * Re-walk D2 and D4. D2: "Filed under" shows the home's stored name, never its id. D4: saving an
 * edited coding schedule on a computer refetches its row into the store (the detail reads the store,
 * and showed the schedule as it was before the edit).
 */
import { homeLabel } from "../../utils/computerWork";

const calls: string[] = [];
jest.mock("../queries", () => ({ updateComputerCodingTask: jest.fn(async () => void calls.push("update")) }));
jest.mock("../../redux/tasks/thunks", () => ({ fetchScheduledTask: (id: string) => ({ type: "refetch", id }) }));

describe("a computer schedule's detail", () => {
  it("D2: names each home by the name it was filed with", () => {
    expect(homeLabel({ token: "project", id: "7f4cf712-0000-4000-8000-000000000000", label: "Website relaunch" })).toBe("Website relaunch");
    expect(homeLabel({ token: "war_room", id: "w-1", label: "w-1" })).toBe("A war room");
  });

  it("D4: saving an edit refetches the row into the store, after the save", async () => {
    const { saveComputerCodingEdit } = await import("../saveComputerCodingEdit");
    const dispatched: unknown[] = [];
    await saveComputerCodingEdit(
      (a) => {
        calls.push("dispatch");
        dispatched.push(a);
      },
      { id: "task-1", deviceOp: null, triggerId: null },
      { title: "t", description: null, deviceId: "d", provider: "claude", folder: "/w", prompt: "p", accountProfileId: null, trigger: { type: "one-shot", at: "2030-01-01T00:00:00Z" } as never },
    );
    expect(calls).toEqual(["update", "dispatch"]);
    expect(dispatched).toEqual([{ type: "refetch", id: "task-1" }]);
  });
});
