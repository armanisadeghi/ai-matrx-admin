/** @jest-environment jsdom */
/**
 * Review 2026-10-21, finding 6: the welcome's limits are knobs. The photo-group wait follows the knob (a short knob
 * settles the cards early; the old 6000 ms constant would not have), an unreadable knob is loud and uses its seeded
 * default, and the seeded migration holds exactly the defaults the code mirrors.
 */
import fs from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { EvidenceItem } from "../../evidence";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockKnobInt = jest.fn<Promise<number>, [string, string]>();
jest.mock("@/lib/knobs/featureKnobs", () => ({ knobInt: (f: string, k: string) => mockKnobInt(f, k) }));
jest.mock("../../logoGroups", () => ({ postImageGroups: () => new Promise(() => undefined) }));
jest.mock("../peopleGroups", () => ({
  candidatePhotos: () => [
    { key: "a", url: "https://x/a.jpg" },
    { key: "b", url: "https://x/b.jpg" },
  ],
}));

// eslint-disable-next-line import/first -- after the mocks
import { usePersonPhotoGroups } from "../usePersonPhotoGroups";
// eslint-disable-next-line import/first
import { WELCOME_KNOB_DEFAULTS, WELCOME_KNOB_KEYS, readWelcomeKnob } from "../welcomeKnobs";

let settled: boolean | null = null;
function Probe() {
  settled = usePersonPhotoGroups([] as EvidenceItem[], "Dana Reyes", true).settled;
  return null;
}

describe("welcome limits are knobs", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockKnobInt.mockReset();
    settled = null;
  });
  afterEach(() => jest.useRealTimers());

  it("the photo-group wait is the knob's value: 500 ms settles the cards long before the old 6000", async () => {
    mockKnobInt.mockResolvedValue(500);
    const host = document.createElement("div");
    await act(async () => createRoot(host).render(<Probe />));
    expect(mockKnobInt).toHaveBeenCalledWith("welcome", "photo_groups_wait_ms");
    expect(settled).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(settled).toBe(true);
  });

  it("an unreadable knob is loud and falls back to its seeded default", async () => {
    mockKnobInt.mockRejectedValue(new Error('Missing feature knob "welcome.found_poll_ms"'));
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await readWelcomeKnob("foundPollMs")).toBe(30_000);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("welcome.found_poll_ms"), expect.anything());
    err.mockRestore();
  });

  it("the seeded migration holds exactly the defaults the code mirrors", () => {
    const sql = fs.readFileSync(path.join(process.cwd(), "..", "aidream", "db", "migrations", "wf_107_welcome_found_search_knobs.sql"), "utf8");
    for (const name of Object.keys(WELCOME_KNOB_KEYS) as (keyof typeof WELCOME_KNOB_KEYS)[]) {
      const value = WELCOME_KNOB_DEFAULTS[name];
      expect(sql).toContain(`('welcome', '${WELCOME_KNOB_KEYS[name]}', '${value}', '${value}', 'integer'`);
    }
  });
});
