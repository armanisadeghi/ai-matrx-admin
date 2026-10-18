/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "./route";

test("REGRESSION: a legacy GitHub callback never exchanges a code or exposes a token", async () => {
  const fetchMock = jest.spyOn(global, "fetch");

  const response = await GET(
    new NextRequest(
      "https://www.aimatrx.com/app_callback?provider=github&code=github-code-must-not-leave-this-route&state=untrusted-state",
    ),
  );

  expect(response.status).toBe(307);
  const redirect = new URL(response.headers.get("location") ?? "");
  expect(redirect.pathname).toBe("/api/github/oauth/complete");
  expect(redirect.searchParams.get("return_url")).toBe("/user-settings/integrations");
  expect(redirect.searchParams.get("github_error")).toBe(
    "Connect GitHub from AI Matrx Settings.",
  );
  expect(redirect.href).not.toContain("github-code-must-not-leave-this-route");
  expect(redirect.href).not.toContain("untrusted-state");
  expect(fetchMock).not.toHaveBeenCalled();

  fetchMock.mockRestore();
});

test.each(["slack", "notion", "anything"])(
  "REGRESSION: a legacy %s callback never exchanges a code or puts a token in a URL",
  async (provider) => {
    const fetchMock = jest.spyOn(global, "fetch");
    const response = await GET(
      new NextRequest(`https://www.aimatrx.com/app_callback?provider=${provider}&code=code-must-not-leave&state=s1`),
    );
    expect(response.status).toBe(307);
    const redirect = new URL(response.headers.get("location") ?? "");
    expect(redirect.pathname).toBe("/user-settings/integrations");
    expect(redirect.search).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  },
);
