/**
 * The chooser's Run goes through THE coding door (`startCodingRun` + `fileMatrx2Run`), never a
 * direct `coding.start` of its own: the start carries the chosen computer, provider and account,
 * and the chat is filed under the person's homes once it reaches AI Matrx.
 */
import { runOnChosenComputer } from "../computerChooser";
import * as door from "../matrx2Coding";

jest.mock("../matrx2Coding", () => ({
  ...jest.requireActual("../matrx2Coding"),
  startCodingRun: jest.fn(),
  fileMatrx2Run: jest.fn(),
}));

const doors = {} as door.CodingDoors;
const request = { deviceId: "dev-1", name: "Studio", provider: "codex" as const, folder: "/w", accountProfileId: "acct-9" };

describe("Run on a chosen computer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts through the coding door on that computer and files the chat", async () => {
    jest.mocked(door.startCodingRun).mockResolvedValue({ via: "matrx2", computer: { deviceId: "dev-1", name: "Studio" }, sessionId: "s.1", runId: "r", queued: false });
    jest.mocked(door.fileMatrx2Run).mockResolvedValue({ conversationId: "c-1" });
    const run = await runOnChosenComputer(doors, request, "Do it");
    expect(door.startCodingRun).toHaveBeenCalledWith(doors, { via: "matrx2", computer: { deviceId: "dev-1", name: "Studio" } }, { cwd: "/w", prompt: "Do it", provider: "codex", accountProfileId: "acct-9" });
    expect(door.fileMatrx2Run).toHaveBeenCalledWith(doors, { deviceId: "dev-1", name: "Studio" }, "s.1");
    expect(run.link).toBe("/devices/dev-1?view=sessions&s=%23s%2Fs.1");
    await expect(run.filing).resolves.toEqual({ conversationId: "c-1" });
  });

  it("a refusal comes back in the computer's words and nothing is filed", async () => {
    jest.mocked(door.startCodingRun).mockRejectedValue(new Error("Studio: This folder is not one remote starts may use"));
    await expect(runOnChosenComputer(doors, request, "Do it")).rejects.toThrow("This folder is not one remote starts may use");
    expect(door.fileMatrx2Run).not.toHaveBeenCalled();
  });
});

describe("Schedule it instead", () => {
  it("carries the folder, coding app and account into the schedule builder", async () => {
    const { computerScheduleParams } = await import("../computerChooser");
    const q = new URLSearchParams(computerScheduleParams({ folder: "/w/a b", provider: "codex", accountProfileId: "acct-9" }).slice(1));
    expect([q.get("folder"), q.get("provider"), q.get("account")]).toEqual(["/w/a b", "codex", "acct-9"]);
    expect(computerScheduleParams(null)).toBe("");
  });
});
