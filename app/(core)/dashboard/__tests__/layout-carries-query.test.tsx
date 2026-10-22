/**
 * A link opened on /dashboard by someone not yet onboarded lands on /welcome WITH its query: the found-you notice's
 * `?panels=welcome-found&org=…` must still open its window there (prod check 2026-10-21: the funnel dropped it).
 */
const verdictMock = jest.fn();
const redirectMock = jest.fn((href: string) => {
  throw new Error(`REDIRECT ${href}`);
});
let search = "";

jest.mock("@/utils/supabase/sessionVerdict", () => ({
  getSessionVerdict: (...args: unknown[]) => verdictMock(...args),
}));
jest.mock("next/navigation", () => ({
  redirect: (href: string) => redirectMock(href),
}));
jest.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": "/dashboard", "x-search-params": search }),
}));
jest.mock("@/utils/route-metadata", () => ({ createRouteMetadata: () => ({}) }));

import DashboardLayout from "../layout";
import { welcomeRedirectHref } from "@/utils/onboarding";

const NEW_USER = { user: { id: "8c2d4b7e-1f3a-4e9b-a6c5-0d7e2f9b1a34", user_metadata: {} } };
const DONE_USER = { user: { id: "8c2d4b7e-1f3a-4e9b-a6c5-0d7e2f9b1a34", user_metadata: { onboarding_completed: true } } };

beforeEach(() => {
  redirectMock.mockClear();
  verdictMock.mockReset();
});

describe("the /dashboard → /welcome funnel carries the query", () => {
  it("keeps ?panels=welcome-found and every other param", async () => {
    search = "?panels=welcome-found&org=5dc930e9-bd65-44a1-8369-af773f6e1a5b";
    verdictMock.mockResolvedValue(NEW_USER);
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "REDIRECT /welcome?panels=welcome-found&org=5dc930e9-bd65-44a1-8369-af773f6e1a5b",
    );
  });

  it("goes to plain /welcome with no query", async () => {
    search = "";
    verdictMock.mockResolvedValue(NEW_USER);
    await expect(DashboardLayout({ children: null })).rejects.toThrow("REDIRECT /welcome");
    expect(redirectMock).toHaveBeenCalledWith("/welcome");
  });

  it("never funnels an onboarded person", async () => {
    search = "?panels=welcome-found";
    verdictMock.mockResolvedValue(DONE_USER);
    await expect(DashboardLayout({ children: "page" })).resolves.toBe("page");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("welcomeRedirectHref accepts the search with or without its ?", () => {
    expect(welcomeRedirectHref("panels=welcome-found")).toBe("/welcome?panels=welcome-found");
    expect(welcomeRedirectHref("?panels=welcome-found")).toBe("/welcome?panels=welcome-found");
    expect(welcomeRedirectHref(null)).toBe("/welcome");
    expect(welcomeRedirectHref("?")).toBe("/welcome");
  });
});
