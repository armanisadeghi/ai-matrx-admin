/**
 * Meet Matrx for existing people: shown once, on home, never over another first-run step.
 * Each "not shown" case flips exactly one input of an otherwise-showing case, so the base case
 * proves the rule can say yes and every other case proves it can say no.
 */
import { shouldShowMeetMatrxIntro, isHomePath } from "../meetMatrxIntro";
import { MEET_MATRX_GROUPS } from "../meetMatrx";

const existing = { user_metadata: { onboarding_completed: true } };
const base = { user: existing, pathname: "/dashboard", ageSettled: true, shownThisSession: false };

describe("shouldShowMeetMatrxIntro", () => {
  it("shows to an existing person who has not met Matrx, on home", () => {
    expect(shouldShowMeetMatrxIntro(base)).toBe(true);
  });
  it("not when already seen (server-side flag)", () => {
    expect(shouldShowMeetMatrxIntro({ ...base, user: { user_metadata: { onboarding_completed: true, meet_matrx_seen: true } } })).toBe(false);
  });
  it("not for a brand-new account (its welcome has the step)", () => {
    expect(shouldShowMeetMatrxIntro({ ...base, user: { user_metadata: {} } })).toBe(false);
  });
  it("not away from home, and not on /welcome", () => {
    expect(shouldShowMeetMatrxIntro({ ...base, pathname: "/agents/all" })).toBe(false);
    expect(shouldShowMeetMatrxIntro({ ...base, pathname: "/welcome" })).toBe(false);
    expect(isHomePath("/dashboard/")).toBe(true);
  });
  it("not while the age question is open, not twice a session, not signed out", () => {
    expect(shouldShowMeetMatrxIntro({ ...base, ageSettled: false })).toBe(false);
    expect(shouldShowMeetMatrxIntro({ ...base, shownThisSession: true })).toBe(false);
    expect(shouldShowMeetMatrxIntro({ ...base, user: null })).toBe(false);
  });
});

describe("Knowledge pitch", () => {
  const k = MEET_MATRX_GROUPS.flatMap((g) => g.items).find((i) => i.id === "knowledge")!;
  it("says everything, one place, never forgotten, and not 'documents'", () => {
    expect(k.pitch).toMatch(/everything/i);
    expect(k.pitch).toMatch(/one place/i);
    expect(k.pitch).toMatch(/never forget/i);
    expect(k.pitch).not.toMatch(/document|file/i);
  });
});
