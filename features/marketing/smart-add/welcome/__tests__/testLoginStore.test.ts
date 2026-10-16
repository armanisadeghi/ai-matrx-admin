/** @jest-environment jsdom */
import { readTestLogin, writeTestLogin } from "../testLoginStore";
import { EMPTY_TEST_LOGIN } from "../welcomeSession";
import { fitScale, FIT_FLOOR } from "../../found/FitText";

describe("the admin's test login survives a reload", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("reads back exactly what was written", () => {
    const t = { ...EMPTY_TEST_LOGIN, email: "a@b.co", name: "Ann Lee", provider: "github" as const, githubLogin: "annlee" };
    writeTestLogin(t);
    expect(readTestLogin()).toEqual(t);
  });

  it("is empty before anything is written, and after it is cleared", () => {
    expect(readTestLogin()).toBeNull();
    writeTestLogin({ ...EMPTY_TEST_LOGIN, name: "Ann" });
    writeTestLogin(null);
    expect(readTestLogin()).toBeNull();
  });

  it("never throws when storage is unavailable or holds junk", () => {
    window.sessionStorage.setItem("matrx:client:welcome.test-login", "{not json");
    expect(readTestLogin()).toBeNull();
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeTestLogin({ ...EMPTY_TEST_LOGIN, name: "Ann" })).not.toThrow();
    spy.mockRestore();
  });
});

describe("a domain fits its slot without ever breaking mid-word", () => {
  it("keeps full size when it fits", () => expect(fitScale(100, 200)).toBe(1));
  it("shrinks in proportion when too wide", () => expect(fitScale(300, 240)).toBe(0.79));
  it("gives up shrinking at the floor (then it may wrap only at a dot)", () => {
    expect(fitScale(1000, 240)).toBeNull();
    expect(fitScale(480, 240)).toBeNull();
    expect(fitScale(470, 240)).toBe(0.5);
  });
});
