import {
  CONNECT_TIMEOUT_MS,
  elapsedText,
  parsePendingConnect,
  resumeStep,
} from "@/features/ai-work/lib/claudeConnectFlow";
import type { OwnPlanStatus } from "@/features/ai-work/lib/ownPlan";

const NOW = 1_000_000_000;
const status = (over: Partial<OwnPlanStatus>): OwnPlanStatus =>
  ({ provider: "claude_code", state: "signed_out", signed_in: false, ...over }) as OwnPlanStatus;

describe("resuming a Claude sign-in after a reload", () => {
  const pending = { slot: "primary", startedAt: NOW - 60_000 };

  it("awaiting_code with its link resumes at the link and code field", () => {
    const s = status({ state: "awaiting_code", sign_in_url: "https://claude.ai/oauth/x" });
    expect(resumeStep(pending, s, NOW)).toEqual({ kind: "awaiting", status: s });
  });
  it("signed in while away", () => {
    expect(resumeStep(pending, status({ state: "signed_in", signed_in: true }), NOW)).toEqual({ kind: "signed_in" });
  });
  it("still booting inside the connect window keeps waiting", () => {
    expect(resumeStep(pending, status({ state: "starting" }), NOW)).toEqual({ kind: "keep_starting" });
  });
  it("an old or ended sign-in is forgotten", () => {
    const old = { slot: "primary", startedAt: NOW - CONNECT_TIMEOUT_MS - 1 };
    expect(resumeStep(old, status({ state: "starting" }), NOW)).toEqual({ kind: "forget" });
    expect(resumeStep(pending, status({ state: "signed_in_not_plan" }), NOW)).toEqual({ kind: "forget" });
  });
  it("the remembered record is only a slot and a time", () => {
    expect(parsePendingConnect(JSON.stringify({ slot: "a1", startedAt: 5 }))).toEqual({ slot: "a1", startedAt: 5 });
    expect(parsePendingConnect("{bad")).toBeNull();
    expect(parsePendingConnect(JSON.stringify({ slot: "", startedAt: 5 }))).toBeNull();
    expect(parsePendingConnect(null)).toBeNull();
  });
  it("the wait is counted", () => {
    expect(elapsedText(0)).toBe("0:00");
    expect(elapsedText(102_400)).toBe("1:42");
  });
});
