/**
 * @jest-environment jsdom
 */
import { decodeOfficeLookCookie, encodeOfficeLookCookie, OFFICE_LOOK_COOKIE } from "../office-look-cookie";
import { officeLookCookieMiddleware } from "@/lib/redux/preferences/officeLookCookieMiddleware";

const U = "11111111-1111-1111-1111-111111111111";

it("round-trips a look for the same person and never for someone else", () => {
  expect(decodeOfficeLookCookie(encodeOfficeLookCookie(U, "microsoft"), U)).toBe("microsoft");
  expect(decodeOfficeLookCookie(encodeOfficeLookCookie(U, "google"), U)).toBe("google");
  expect(decodeOfficeLookCookie(encodeOfficeLookCookie(U, "microsoft"), "someone-else")).toBeNull();
  expect(decodeOfficeLookCookie(`${U}:bogus`, U)).toBeNull();
  expect(decodeOfficeLookCookie(undefined, U)).toBeNull();
});

function run(state: unknown) {
  const store = { getState: () => state, dispatch: () => undefined } as never;
  officeLookCookieMiddleware(store)((a: unknown) => a)({ type: "x" });
}

it("mirrors the look into the cookie only once saved preferences are loaded", () => {
  document.cookie = `${OFFICE_LOOK_COOKIE}=; max-age=0`;
  run({ userAuth: { id: U }, userPreferences: { display: { officeLook: "microsoft" }, _meta: { loadStatus: "loading" } } });
  expect(document.cookie).not.toContain(OFFICE_LOOK_COOKIE);
  run({ userAuth: { id: U }, userPreferences: { display: { officeLook: "microsoft" }, _meta: { loadStatus: "loaded" } } });
  expect(decodeURIComponent(document.cookie)).toContain(`${OFFICE_LOOK_COOKIE}=${U}:microsoft`);
  run({ userAuth: { id: U }, userPreferences: { display: {}, _meta: { loadStatus: "loaded" } } });
  expect(decodeURIComponent(document.cookie)).toContain(`${U}:google`);
});
