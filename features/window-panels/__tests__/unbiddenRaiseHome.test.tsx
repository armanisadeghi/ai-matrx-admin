/**
 * mayRaiseUnbidden — the window registry decides where a window may open ITSELF.
 *
 * The daily spend window that first used this primitive is gone (2026-10-10: its facts are a row on
 * the super-admin attention dock, the one admin-alert surface), so the allow/refuse rules are
 * proven against a registry fixture with the same declared home; the no-home cases use real entries.
 */

import { mayRaiseUnbidden } from "../utils/mayRaiseUnbidden";
import { getStaticEntryByOverlayId } from "../registry/windowRegistryMetadata";

jest.mock("../registry/windowRegistryMetadata", () => {
  const actual = jest.requireActual("../registry/windowRegistryMetadata");
  return {
    ...actual,
    getStaticEntryByOverlayId: (id: string) =>
      id === "homedWindow"
        ? {
            slug: "homed-window",
            overlayId: "homedWindow",
            kind: "window",
            label: "Homed window",
            unbiddenHome: ["/dashboard", { route: "/administration", exact: true }, "/administration/spend"],
          }
        : actual.getStaticEntryByOverlayId(id),
  };
});

const SPEND = "homedWindow";

describe("mayRaiseUnbidden — the window registry decides where a window may open itself", () => {
  let warn: jest.SpyInstance;
  let info: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    info = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    info.mockRestore();
  });

  it("(a) refuses a homed window on /exports — the page is a drop zone, not its home", () => {
    const verdict = mayRaiseUnbidden(SPEND, "/exports");

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe("away-from-home");
    // Not silent about it.
    expect(verdict.reason).toContain("/exports");
    expect(info).toHaveBeenCalled();
  });

  it("(a2) refuses it on every other route that is not its home", () => {
    for (const route of ["/chat", "/masterwork", "/exports/new", "/"]) {
      expect(mayRaiseUnbidden(SPEND, route).allowed).toBe(false);
    }
  });

  it("(b) allows it on its declared home, and on pages nested under it", () => {
    for (const route of [
      "/dashboard",
      "/administration",
      "/administration/spend",
    ]) {
      const verdict = mayRaiseUnbidden(SPEND, route);
      expect({ route, allowed: verdict.allowed }).toEqual({
        route,
        allowed: true,
      });
    }
  });

  it("(b1) refuses it on working administration pages — only the landing page is home", () => {
    for (const route of [
      "/administration/intelligence/mandates",
      "/administration/intelligence/mandates/agent_apps.auto_create",
      "/administration/users",
    ]) {
      expect({ route, allowed: mayRaiseUnbidden(SPEND, route).allowed }).toEqual({
        route,
        allowed: false,
      });
    }
  });

  it("(b2) does not mistake a route that merely starts with the same letters for home", () => {
    expect(mayRaiseUnbidden(SPEND, "/administration-archive").allowed).toBe(
      false,
    );
  });

  it("(c) refuses a window that declared no home — anywhere — and warns naming it", () => {
    // A real registry entry with no `unbiddenHome`, so this cannot rot into a
    // test about a fixture.
    const undeclared = "structuredValueWindow";
    expect(getStaticEntryByOverlayId(undeclared)?.unbiddenHome).toBeUndefined();

    const verdict = mayRaiseUnbidden(undeclared, "/dashboard");

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe("no-declared-home");
    expect(warn).toHaveBeenCalled();
    const message = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(message).toContain(undeclared);
    expect(message).toContain("unbiddenHome");
  });

  it("(c2) refuses an overlay the registry has never heard of, and warns", () => {
    const verdict = mayRaiseUnbidden("someWindowNobodyRegistered", "/dashboard");
    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe("no-declared-home");
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes("someWindowNobodyRegistered"),
      ),
    ).toBe(true);
  });
});
