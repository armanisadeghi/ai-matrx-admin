import { brokeredFetch, resolveBrokeredTransport } from "@/lib/api/broker/transport";
import { getBrokeredCredential } from "@/lib/api/broker/cache";

jest.mock("@/lib/api/broker/cache", () => ({
  getBrokeredCredential: jest.fn(),
  reportCredentialRejected: jest.fn(),
}));

const cred = {
  token: "t",
  credential_mode: "proxied",
  endpoint: "https://gw.test",
  protocol: "anthropic",
  model: null,
};

describe("broker relay initiation", () => {
  beforeEach(() => {
    (getBrokeredCredential as jest.Mock).mockResolvedValue(cred);
    global.fetch = jest.fn().mockResolvedValue(new Response("{}", { status: 200 })) as never;
  });

  it("sends x-matrx-initiation: user when a person started the call", async () => {
    await brokeredFetch({ audience: "anthropic", tierPolicy: "none" }, "/v1/messages", {}, "user");
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(headers.get("x-matrx-initiation")).toBe("user");
  });

  it("forwards auto through resolveBrokeredTransport's bound fetch", async () => {
    const t = await resolveBrokeredTransport(
      { audience: "anthropic", tierPolicy: "none" },
      { initiation: "auto" },
    );
    if (t.mode !== "proxied") throw new Error("expected proxied");
    await t.fetch("/v1/messages");
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(headers.get("x-matrx-initiation")).toBe("auto");
  });
});
