/**
 * ONE owner for "where does a finished sign-in go". Regression (W1-H2 review): the callback built
 * `${baseUrl}${redirectTo}`, so an allowed absolute Office URL became
 * `https://www.aimatrx.comhttps://docs.aimatrx.com/f/x`, and VerifyingHold dropped it to "/".
 */
import fs from "node:fs";
import path from "node:path";
import {
  authDestinationOr,
  resolveAuthDestinationUrl,
} from "@/utils/auth/auth-destination";
import { verifyingTarget } from "@/app/auth/verifying/VerifyingHold";

const BASE = "https://www.aimatrx.com";
const root = path.resolve(__dirname, "../../..");

// What the email-link callback and the OAuth callback both do with the raw `redirectTo` param.
const callback = (raw: string | null) =>
  resolveAuthDestinationUrl(BASE, authDestinationOr(raw ? { redirectTo: raw } : null));

describe("resolveAuthDestinationUrl", () => {
  it("returns an allowed absolute URL as-is", () => {
    expect(callback("https://docs.aimatrx.com/f/x")).toBe("https://docs.aimatrx.com/f/x");
    expect(callback(encodeURIComponent("https://sheets.aimatrx.com/f/1?a=b"))).toBe(
      "https://sheets.aimatrx.com/f/1?a=b",
    );
  });
  it("joins a relative path onto the base", () => {
    expect(callback("/tasks?view=board")).toBe(`${BASE}/tasks?view=board`);
    expect(callback(null)).toBe(`${BASE}/dashboard`);
  });
  it("refuses an off-site absolute URL (falls to the default, never leaves)", () => {
    for (const bad of ["https://evil.com/x", "https://aimatrx.com.evil.com/x", "//evil.com", "@evil.com"]) {
      expect(callback(bad)).toBe(`${BASE}/dashboard`);
    }
  });
  it("never produces a doubled-scheme URL", () => {
    expect(callback("https://docs.aimatrx.com/f/x")).not.toMatch(/aimatrx\.comhttps/);
  });
});

describe("VerifyingHold target", () => {
  it("keeps an allowed absolute next, refuses others", () => {
    expect(verifyingTarget("https://docs.aimatrx.com/f/x")).toBe("https://docs.aimatrx.com/f/x");
    expect(verifyingTarget("/tasks")).toBe("/tasks");
    expect(verifyingTarget("https://evil.com")).toBe("/");
    expect(verifyingTarget(undefined)).toBe("/");
  });
});

describe("the class: no hand-joined destinations, one return-URL owner", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
    return out;
  }
  const files = ["app", "utils", "lib"].flatMap((d) => walk(path.join(root, d)));

  it("nothing concatenates a base with a redirect destination", () => {
    const re = /\$\{(?:baseUrl|origin)\}\$\{(?:redirectTo|finalRedirectTo|redirect_to|returnTo|destination)\}/;
    // The owner itself, and Stripe checkout (its returnTo is relative-only by design: safePath, same server origin).
    const allowed = new Set(["utils/auth/auth-destination.ts", "app/api/stripe/class-checkout/route.ts"]);
    const hits = files
      .filter((f) => re.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f))
      .filter((f) => !allowed.has(f));
    expect(hits).toEqual([]);
  });

  it("safeReturnUrl is defined exactly once", () => {
    const defs = files
      .filter((f) => /function safeReturnUrl\b/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(defs).toEqual(["utils/auth/safe-redirect.ts"]);
  });
});
