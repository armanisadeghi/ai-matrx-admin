/**
 * WHO GETS THE NEW APP FRAME (frameMode.ts): guests never; only the rollout's people; `?frame=`
 * wins for the request; else the remembered cookie. The kill switch is read by the server only
 * when this says "frame" (frameMode.server.ts).
 */
import { FRAME_ROLLOUT, frameParam, pickFrameMode, rolloutAdmits } from "../frameMode";

const admin = { isAuthenticated: true, isAdmin: true };
const member = { isAuthenticated: true, isAdmin: false };
const guest = { isAuthenticated: false, isAdmin: false };

it("ships admins-only", () => {
  expect(FRAME_ROLLOUT).toBe("admins");
});

it("reads ?frame= only as new or classic", () => {
  expect(frameParam("?frame=new")).toBe("new");
  expect(frameParam("a=1&frame=classic")).toBe("classic");
  expect(frameParam("?frame=yes")).toBeNull();
  expect(frameParam("")).toBeNull();
  expect(frameParam(null)).toBeNull();
});

it("never gives a guest or a member the frame under the admins rollout, whatever they ask", () => {
  for (const who of [guest, member]) {
    expect(pickFrameMode({ search: "?frame=new", cookie: "new", ...who })).toBe("classic");
  }
});

it("an admin: the param wins, else the cookie, else classic", () => {
  expect(pickFrameMode({ search: "?frame=new", cookie: undefined, ...admin })).toBe("frame");
  expect(pickFrameMode({ search: "?frame=classic", cookie: "new", ...admin })).toBe("classic");
  expect(pickFrameMode({ search: "", cookie: "new", ...admin })).toBe("frame");
  expect(pickFrameMode({ search: "?x=1", cookie: undefined, ...admin })).toBe("classic");
});

it("rollout stages admit the right people", () => {
  expect(rolloutAdmits("off", admin)).toBe(false);
  expect(rolloutAdmits("everyone-optin", member)).toBe(true);
  expect(rolloutAdmits("everyone", guest)).toBe(false);
  expect(pickFrameMode({ search: "", cookie: undefined, rollout: "everyone", ...member })).toBe("frame");
  expect(pickFrameMode({ search: "", cookie: "classic", rollout: "everyone", ...member })).toBe("classic");
  expect(pickFrameMode({ search: "", cookie: undefined, rollout: "off", ...admin })).toBe("classic");
});
