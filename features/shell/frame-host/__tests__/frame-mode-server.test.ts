/**
 * THE KILL SWITCH AND THE REMEMBERED CHOICE (adversarial review, 2026-10-22: both were untested).
 *   - frameMode.server.ts: the knob is read only when the answer would be "frame"; an explicit
 *     `false` sends everyone to classic; a read that does not answer keeps the person's choice
 *     (fail-open on purpose — a knob outage never flips an admin's layout).
 *   - the middleware's cookie write (rememberFrameChoice, called from utils/supabase/middleware.ts):
 *     `?frame=new` sets it, `?frame=classic` clears it, anything else leaves it alone.
 */
jest.mock("server-only", () => ({}));

const headerValues: Record<string, string | null> = {};
const cookieValues: Record<string, string | undefined> = {};
jest.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
  cookies: async () => ({ get: (name: string) => (cookieValues[name] ? { value: cookieValues[name] } : undefined) }),
}));
const knob = jest.fn<Promise<unknown>, [unknown]>();
jest.mock("@/lib/scoped-config/effectiveKnobs.server", () => ({
  readEffectiveKnobOnServer: (address: unknown) => knob(address),
}));

import { readFrameMode } from "../frameMode.server";
import { FRAME_COOKIE, FRAME_COOKIE_MAX_AGE_S, FRAME_KILL_SWITCH_KNOB, rememberFrameChoice } from "../frameMode";

const admin = { isAuthenticated: true, isAdmin: true };

beforeEach(() => {
  knob.mockReset();
  for (const k of Object.keys(headerValues)) delete headerValues[k];
  for (const k of Object.keys(cookieValues)) delete cookieValues[k];
});

describe("readFrameMode: the kill switch", () => {
  it("knob false → classic, even with ?frame=new", async () => {
    headerValues["x-search-params"] = "?frame=new";
    knob.mockResolvedValue(false);
    await expect(readFrameMode(admin)).resolves.toBe("classic");
    expect(knob).toHaveBeenCalledWith(FRAME_KILL_SWITCH_KNOB);
  });

  it("knob true → the person's choice (frame)", async () => {
    cookieValues[FRAME_COOKIE] = "new";
    knob.mockResolvedValue(true);
    await expect(readFrameMode(admin)).resolves.toBe("frame");
  });

  it("a knob read that does not answer keeps the person's choice (fail-open, intentional)", async () => {
    cookieValues[FRAME_COOKIE] = "new";
    knob.mockResolvedValue(undefined);
    await expect(readFrameMode(admin)).resolves.toBe("frame");
  });

  it("classic answers never read the knob", async () => {
    await expect(readFrameMode(admin)).resolves.toBe("classic");
    await expect(readFrameMode({ isAuthenticated: true, isAdmin: false })).resolves.toBe("classic");
    expect(knob).not.toHaveBeenCalled();
  });
});

describe("rememberFrameChoice: the middleware's cookie write", () => {
  const jar = () => ({ set: jest.fn(), delete: jest.fn() });

  it("?frame=new sets the year-long, site-wide cookie (secure on https)", () => {
    const j = jar();
    rememberFrameChoice({ search: "?tab=1&frame=new", protocol: "https:" }, j);
    expect(j.set).toHaveBeenCalledWith(FRAME_COOKIE, "new", { path: "/", maxAge: FRAME_COOKIE_MAX_AGE_S, sameSite: "lax", secure: true });
    expect(j.delete).not.toHaveBeenCalled();
  });

  it("?frame=classic clears it", () => {
    const j = jar();
    rememberFrameChoice({ search: "?frame=classic", protocol: "http:" }, j);
    expect(j.delete).toHaveBeenCalledWith(FRAME_COOKIE);
    expect(j.set).not.toHaveBeenCalled();
  });

  it("any other value leaves the cookie alone", () => {
    const j = jar();
    rememberFrameChoice({ search: "?frame=sideways", protocol: "https:" }, j);
    rememberFrameChoice({ search: "", protocol: "https:" }, j);
    expect(j.set).not.toHaveBeenCalled();
    expect(j.delete).not.toHaveBeenCalled();
  });

  it("the middleware writes through rememberFrameChoice (one place decides)", () => {
    const src = require("node:fs").readFileSync(require("node:path").join(process.cwd(), "utils/supabase/middleware.ts"), "utf8") as string;
    expect(src).toContain("rememberFrameChoice(request.nextUrl, session.response.cookies)");
    expect(src).not.toMatch(/cookies\.set\(FRAME_COOKIE/);
  });
});
