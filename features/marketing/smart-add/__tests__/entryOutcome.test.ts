import {
  entryCopy,
  entryLabel,
  handleProblem,
  inferEntryOutcome,
  isFailedEntry,
  parseEntryOutcome,
  quietMs,
  replayUnreadable,
  sessionEntry,
  siteReadFailure,
  siteReadLine,
  stagePhase,
  stepCouldNotRead,
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

describe("no data is never 'doesn't exist' (admin opening someone else's run, cde25370)", () => {
  const typedIg = { website: "", social: "@titanium.success", platform: "instagram" };
  const idle = (name: string) => ({ step: name, phase: "idle", progress: null, notes: [], costUsd: 0, skipped: false });
  const emptyReplay = { status: "completed", steps: ["probe", "page", "avatars", "socials", "web", "deep", "local"].map(idle) };

  it("an empty replay concludes nothing about the input", () => {
    expect(inferEntryOutcome(emptyReplay, typedIg, false)).toBeNull();
    expect(inferEntryOutcome(emptyReplay, { website: "ritualcoffee.com", social: "", platform: null }, false)).toBeNull();
  });
  it("an empty replay reads as couldn't load", () => {
    expect(replayUnreadable(emptyReplay, false)).toBe(true);
    expect(stagePhase({ ...base, working: false, unreadable: replayUnreadable(emptyReplay, false) })).toBe("unloaded");
  });
  it("an unreadable run (attach refused) reads as couldn't load, even before a status", () => {
    const refused = { status: null, steps: [], readFailure: "You can't read this run" };
    expect(replayUnreadable(refused, false)).toBe(true);
    expect(inferEntryOutcome(refused, typedIg, false)).toBeNull();
  });
  it("a partial replay with an unrelated note is not not-found", () => {
    const partial = { status: "completed", steps: [step("socials", ["2 accounts found"]), idle("web")] };
    expect(inferEntryOutcome(partial, typedIg, false)).toBeNull();
    expect(replayUnreadable(partial, false)).toBe(false);
  });
  it("a real finished run that found something is neither", () => {
    expect(replayUnreadable(emptyReplay, true)).toBe(false);
    expect(replayUnreadable({ status: "running", steps: [] }, false)).toBe(false);
  });
});

describe("sessionEntry — only a positive signal says doesn't exist", () => {
  const idle = (name: string) => ({ step: name, phase: "idle", progress: null, notes: [], costUsd: 0, skipped: false });
  const ig = (handle: string) => ({ website: "", socials: [{ handle_or_url: `https://www.instagram.com/${handle}`, platform: "instagram" }] });
  const notFoundRound = {
    seeds: ig("titaniumsuccess"),
    view: { status: "completed", steps: [step("socials", ["https://www.instagram.com/titaniumsuccess could not be looked up: We couldn't find that account or post."])] },
  };
  const emptyRound = { seeds: { website: "", socials: [] }, view: { status: "completed", steps: [idle("probe"), idle("web")] } };

  it("a lone round with a not-found note is not-found, named by what THAT round was started with", () => {
    const { outcome, unreadable } = sessionEntry([notFoundRound], false);
    expect(outcome?.status).toBe("not_found");
    expect(entryLabel(outcome!)).toBe("@titaniumsuccess");
    expect(unreadable).toBe(false);
  });
  it("a later round means the session went on from a finding: never not-found", () => {
    expect(sessionEntry([notFoundRound, { seeds: ig("titanium.success"), view: { status: "completed", steps: [step("socials")] } }], false).outcome).toBeNull();
  });
  it("an unreadable round makes the session couldn't-load, even beside a not-found note", () => {
    const refused = { seeds: ig("titaniumsuccess"), view: { status: null, steps: [], readFailure: "refused" } };
    expect(sessionEntry([refused], false)).toEqual({ outcome: null, unreadable: true });
    expect(sessionEntry([notFoundRound, emptyRound], false)).toEqual({ outcome: null, unreadable: true });
  });
  it("an empty replay of a typed round is couldn't-load, not not-found", () => {
    expect(sessionEntry([{ seeds: ig("titanium.success"), view: { status: "completed", steps: [idle("socials")] } }], false)).toEqual({
      outcome: null,
      unreadable: true,
    });
  });
  it("the server's own not-found answer stands", () => {
    const server = { ...notFoundRound, view: { status: "completed", steps: [], entry: { status: "not_found" as const, subject: "account" as const, input: "x", platform: "instagram" } } };
    expect(sessionEntry([server], false).outcome?.status).toBe("not_found");
  });  // Recorded run 5dfabe93 (vaturals.com, 2026-10-15): the site answered 403 to both reads, the server judged the entry
  // confirmed (search found it, the facts agent ran), and nothing the screen counts as "read" came back.
  it("the server's confirmed answer stands over a blocked-site note (MKT-093)", () => {
    const steps = [
      step("probe", ["vaturals.com could not be read directly: the site answered 403"]),
      step("page", ["vaturals.com could not be read: blocked"]),
      step("web"),
    ];
    const seeds = { website: "vaturals.com", socials: [] };
    const confirmed = { seeds, view: { status: "completed", steps, entry: { status: "confirmed" as const, subject: "account" as const, input: "", platform: null } } };
    expect(sessionEntry([confirmed], false)).toEqual({ outcome: null, unreadable: false });
    // Without the server's answer (an older server) the notes still decide.
    expect(sessionEntry([{ seeds, view: { status: "completed", steps } }], false).outcome?.status).toBe("blocked");
    // And the screen names the unread site beside the results.
    const unread = siteReadFailure({ steps }, "vaturals.com");
    expect(unread && siteReadLine(unread)).toBe("vaturals.com blocked our reader");
  });
});

describe("siteReadFailure", () => {
  // Recorded notes from run 0f75b0ca (2026-10-15): a 403 on the quick check, then the scraper timed out.
  const view = {
    steps: [
      { step: "probe", phase: "completed", progress: null, notes: ["dynamiteroasting.com could not be read directly: the site answered 403"], costUsd: 0, skipped: false },
      { step: "page", phase: "running", progress: "Reading dynamiteroasting.com the long way", notes: ["dynamiteroasting.com could not be read: request_error"], costUsd: 0, skipped: false },
    ],
  };

  it("names a site that blocked the read, even when the round found it on the web", () => {
    const o = siteReadFailure(view, "dynamiteroasting.com");
    expect(o?.status).toBe("blocked");
    expect(o && siteReadLine(o)).toBe("dynamiteroasting.com blocked our reader");
  });

  it("a step that said it could not read the site is no longer 'reading it the long way'", () => {
    expect(stepCouldNotRead(view.steps[1])).toBe(true);
    expect(stepCouldNotRead({ step: "page", notes: [] })).toBe(false);
  });

  it("a link-in-bio page that failed is not the typed site blocking us (MKT-108)", () => {
    const bio = { steps: [{ ...view.steps[1], notes: ["The bio link linktr.ee could not be read: the site answered 429"] }] };
    expect(siteReadFailure(bio, "dynamiteroasting.com")).toBeNull();
    const mixed = { steps: [{ ...view.steps[0], notes: [] }, { ...view.steps[1], notes: ["The bio link linktr.ee could not be read: the site answered 429", "dynamiteroasting.com could not be read: request_error"] }] };
    expect(siteReadFailure(mixed, "dynamiteroasting.com")?.status).toBe("site_error");
  });

  it("is null when the page was read, or nothing was typed", () => {
    expect(siteReadFailure({ steps: [{ ...view.steps[1], notes: [] }] }, "dynamiteroasting.com")).toBeNull();
    expect(siteReadFailure(view, "")).toBeNull();
  });
});
