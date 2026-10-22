/**
 * The age question's "Not now" is kept on the ACCOUNT (prod check 2026-10-21: /welcome's full-page age step asked
 * again on every load because the skip lived only in sessionStorage). A later visit starts past the age step while
 * the snooze is in force, and asks again once it runs out; compliance (the band) is never touched.
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: { auth: {} } }));

import { AGE_NOT_NOW_DAYS, AGE_NOT_NOW_KEY, ageNotNowActive, ageNotNowPatch } from "@/features/education/compliance/ageNotNow";
import { firstStep } from "../welcomeSteps";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-22T12:00:00Z");

describe("age Not now on the account", () => {
  it("a fresh Not now is in force; an old one, a missing one or junk is not", () => {
    const user = (v: unknown) => ({ user_metadata: { [AGE_NOT_NOW_KEY]: v } });
    expect(ageNotNowActive({ user_metadata: ageNotNowPatch(NOW) }, NOW + DAY)).toBe(true);
    expect(ageNotNowActive(user(new Date(NOW - (AGE_NOT_NOW_DAYS * DAY - 1000)).toISOString()), NOW)).toBe(true);
    expect(ageNotNowActive(user(new Date(NOW - (AGE_NOT_NOW_DAYS * DAY + 1000)).toISOString()), NOW)).toBe(false);
    expect(ageNotNowActive({ user_metadata: {} }, NOW)).toBe(false);
    expect(ageNotNowActive(null, NOW)).toBe(false);
    expect(ageNotNowActive(user("soon"), NOW)).toBe(false);
    expect(ageNotNowActive(user(true), NOW)).toBe(false);
  });

  it("a new account with Not now in force starts past the age step", () => {
    expect(firstStep({ newUser: true, meetSeen: false })).toBe("age");
    expect(firstStep({ newUser: true, meetSeen: false, ageNotNow: true })).toBe("meet");
    expect(firstStep({ newUser: true, meetSeen: true, ageNotNow: true })).toBe("start");
    expect(firstStep({ newUser: true, meetSeen: false, ageNotNow: true, foundAsked: true })).toBe("identity");
  });
});
