// The unlock cookie of a password-protected view link is signed with the server's secret, belongs to ONE link, and
// is refused when tampered with or made for another link. (The password itself is judged by the store: viewlink2_green.sql.)
// jest globals
import { makeUnlockCookieValue, readUnlockCookieValue, unlockCookieName } from "../unlock";

const A = "a1".repeat(32);
const B = "b2".repeat(32);
const FP = "c3".repeat(32);

beforeEach(() => {
  process.env.SUPABASE_SECRET_KEY = "test-secret-not-a-real-key";
});

it("round-trips the fingerprint for the link it was made for", () => {
  expect(readUnlockCookieValue(A, makeUnlockCookieValue(A, FP))).toBe(FP);
});

it("refuses a cookie made for another link, a changed fingerprint and a changed signature", () => {
  const value = makeUnlockCookieValue(A, FP);
  expect(readUnlockCookieValue(B, value)).toBeUndefined();
  expect(readUnlockCookieValue(A, value.replace(FP, "d4".repeat(32)))).toBeUndefined();
  expect(readUnlockCookieValue(A, `${value.slice(0, -2)}00`)).toBeUndefined();
  expect(readUnlockCookieValue(A, undefined)).toBeUndefined();
  expect(readUnlockCookieValue(A, "garbage")).toBeUndefined();
});

it("refuses a cookie signed with another secret", () => {
  const value = makeUnlockCookieValue(A, FP);
  process.env.SUPABASE_SECRET_KEY = "a-different-secret";
  expect(readUnlockCookieValue(A, value)).toBeUndefined();
});

it("names one cookie per link", () => {
  expect(unlockCookieName(A)).not.toBe(unlockCookieName(B));
});
