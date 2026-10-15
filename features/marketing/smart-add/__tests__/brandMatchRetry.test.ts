/** MKT-091: a gateway blip on the live duplicate check is retried; a real error is raised at once. */
jest.mock("@/lib/scoped-config/sessionKnob", () => ({ resolveSessionKnob: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({ authenticatedWebDb: jest.fn() }));

import { isGatewayBlip, withRetryOnGatewayError } from "../brandMatchLive";

describe("withRetryOnGatewayError", () => {
  it("recognises gateway blips and not real errors", () => {
    expect(isGatewayBlip("502 Bad Gateway")).toBe(true);
    expect(isGatewayBlip("TypeError: Failed to fetch")).toBe(true);
    expect(isGatewayBlip('invalid input syntax for type uuid: "x"')).toBe(false);
    expect(isGatewayBlip("permission denied for table brand")).toBe(false);
  });

  it("tries again after a blip and returns the answer", async () => {
    const run = jest.fn().mockRejectedValueOnce(new Error("502 Bad Gateway")).mockResolvedValue("ok");
    await expect(withRetryOnGatewayError(run, 3, 1)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("raises a real error on the first try", async () => {
    const run = jest.fn().mockRejectedValue(new Error("permission denied for table brand"));
    await expect(withRetryOnGatewayError(run, 3, 1)).rejects.toThrow("permission denied");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("raises the last blip after the attempts are used", async () => {
    const run = jest.fn().mockRejectedValue(new Error("503 Service Unavailable"));
    await expect(withRetryOnGatewayError(run, 3, 1)).rejects.toThrow("503");
    expect(run).toHaveBeenCalledTimes(3);
  });
});
