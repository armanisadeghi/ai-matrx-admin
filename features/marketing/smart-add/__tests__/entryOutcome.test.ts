import {
  entryCopy,
  entryLabel,
  handleProblem,
  inferEntryOutcome,
  isFailedEntry,
  parseEntryOutcome,
  quietMs,
  stagePhase,
  websiteProblem,
  type EntryOutcome,
  type StageInputs,
} from "../entryOutcome";

const base: StageInputs = { submitted: true, outcome: null, working: true, failed: false, found: false, quietMs: 0, stallMs: 40_000 };
const notFound: EntryOutcome = { status: "not_found", subject: "account", input: "https://www.instagram.com/titaniumsuccess", platform: "instagram" };
const step = (name: string, notes: string[] = []) => ({ step: name, phase: "settled", progress: null, notes, costUsd: 0, skipped: false });

describe("stagePhase — every entry ends in an honest state", () => {
  it("nothing submitted is the entry", () => {
    expect(stagePhase({ ...base, submitted: false })).toBe("enter");
  });
  it("a running round identifies, then says it is still working once quiet past the knob", () => {
    expect(stagePhase(base)).toBe("identifying");
    expect(stagePhase({ ...base, quietMs: 39_999 })).toBe("identifying");
    expect(stagePhase({ ...base, quietMs: 40_000 })).toBe("slow");
  });
  it("a not-found entry is the answer — even while other steps still run, and never a findings page", () => {
    expect(stagePhase({ ...base, outcome: notFound })).toBe("outcome");
    expect(stagePhase({ ...base, outcome: notFound, working: false, found: true })).toBe("outcome");
  });
  it("a confirmed entry never blocks the findings", () => {
    expect(stagePhase({ ...base, working: false, found: true, outcome: { ...notFound, status: "confirmed" } })).toBe("done");
  });
  it("a broken run says it broke; a clean empty run says nothing was found", () => {
    expect(stagePhase({ ...base, working: false, failed: true })).toBe("failed");
    expect(stagePhase({ ...base, working: false })).toBe("nothing");
  });
});

describe("the server's answer", () => {
  it("parses every status and refuses junk", () => {
    expect(parseEntryOutcome({ status: "not_found", subject: "account", input: "x", platform: "instagram" })).toEqual({
      status: "not_found",
      subject: "account",
      input: "x",
      platform: "instagram",
    });
    expect(parseEntryOutcome({ status: "nonsense" })).toBeNull();
    expect(parseEntryOutcome(null)).toBeNull();
    expect(isFailedEntry(parseEntryOutcome({ status: "confirmed" }))).toBe(false);
    expect(isFailedEntry(parseEntryOutcome({ status: "no_such_site", subject: "website", input: "a.com" }))).toBe(true);
  });
});

describe("inferEntryOutcome — the same answer off the notes of a finished run", () => {
  const typedIg = { website: "", social: "@titaniumsuccess", platform: "instagram" };
  it("reads the live run's not-found note (run cde25370)", () => {
    const view = {
      status: "completed",
      steps: [step("socials", ["https://www.instagram.com/titaniumsuccess could not be looked up: We couldn't find that account or post."])],
    };
    expect(inferEntryOutcome(view, typedIg, false)?.status).toBe("not_found");
  });
  it("never judges a running round or one that found something", () => {
    expect(inferEntryOutcome({ status: "running", steps: [] }, typedIg, false)).toBeNull();
    expect(inferEntryOutcome({ status: "completed", steps: [] }, typedIg, true)).toBeNull();
  });
  it("reads a dead site", () => {
    const view = { status: "completed", steps: [step("probe", ["x.com could not be read directly: ConnectError: [Errno 8] nodename nor servname provided"])] };
    expect(inferEntryOutcome(view, { website: "x.com", social: "", platform: null }, false)?.status).toBe("no_such_site");
  });
});

describe("copy", () => {
  it("names what was typed, short", () => {
    expect(entryLabel(notFound)).toBe("@titaniumsuccess");
    expect(entryLabel({ subject: "website", input: "https://www.nonexistent-zzqq-12345.com/about" })).toBe("nonexistent-zzqq-12345.com");
    const c = entryCopy(notFound);
    expect(c.title).toBe("No account found");
    expect(c.line).toBe("@titaniumsuccess on Instagram doesn't exist.");
    for (const status of ["not_found", "private", "empty", "unsupported", "usage_limit", "provider_failed", "no_such_site", "timed_out", "blocked", "site_error", "parked"] as const) {
      const copy = entryCopy({ ...notFound, status });
      expect(copy.title.length).toBeLessThanOrEqual(30);
      expect(copy.line.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("up-front checks — never a paid run on what cannot exist", () => {
  it.each([
    ["nonexistent-zzqq-12345.com", null],
    ["https://www.ritualcoffee.com/shop", null],
    ["ritual coffee", "A web address has no spaces."],
    ["ritualcoffee", "Add the ending, like .com."],
    ["ritual..com", "Add the ending, like .com."],
    ["bad_host!.com", "Use only letters, numbers and dashes."],
    ["me@ritual.com", "That looks like an email, not a website."],
    ["ritual.c0m", "That ending isn't a real one."],
    ["htp:/ritual", "That isn't a web address."],
  ])("website %s", (text, problem) => {
    expect(websiteProblem(text)).toBe(problem);
  });
  it("platform handle rules", () => {
    expect(handleProblem("instagram", "@titaniumsuccess")).toBeNull();
    expect(handleProblem("instagram", "titanium-success")).toMatch(/only letters, numbers/);
    expect(handleProblem("x", "a".repeat(16))).toMatch(/15 characters/);
    expect(handleProblem("instagram", "a..b")).toMatch(/dot/);
    expect(handleProblem("linkedin", "anything-goes")).toBeNull();
  });
  it("the quiet-time knob", () => {
    expect(quietMs(undefined)).toBe(40_000);
    expect(quietMs("90")).toBe(90_000);
    expect(quietMs(1)).toBe(40_000);
  });
});
