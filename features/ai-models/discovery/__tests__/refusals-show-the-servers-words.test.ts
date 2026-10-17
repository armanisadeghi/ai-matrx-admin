/** @jest-environment node */
/**
 * Every refusal from the discovery engine's admin routes reaches the person in the server's own words:
 * the listing edit (Catalogs editor), placement and promote all go through one helper, and a 409 whose
 * envelope says only "Something went wrong" while its `message` says what happened shows that message.
 * Real helper, real @ai-matrx/api parser; only fetch is a stand-in.
 */
import { discoveryApi, type CallAuth } from "../api";

const auth: CallAuth = { baseUrl: "https://server.example.test", accessToken: "t", organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b" };
const WORDS = "This model was changed at 2026-10-17T04:11:21Z by someone else; reload it and edit again.";

function refuse(body: Record<string, unknown>, status = 409) {
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
}

describe("discovery refusals show the server's words", () => {
  const generic = { error: "conflict", message: WORDS, user_message: "Something went wrong. Please try again later.", current_updated_at: "x" };

  it("listing edit", async () => {
    refuse(generic);
    await expect(discoveryApi.editListing(auth, "m1", { expected_updated_at: "x", description: "y" })).rejects.toThrow(WORDS);
  });

  it("placement and promote share the same path", async () => {
    refuse(generic);
    await expect(discoveryApi.movePlacement(auth, "m1", { page: "text", shelf: "s", shelf_title: "S" })).rejects.toThrow(WORDS);
    refuse({ error: "conflict", message: "This model has no listing yet; promote it first.", user_message: "Something went wrong. Please try again later." });
    await expect(discoveryApi.promote(auth, "c1", {})).rejects.toThrow("This model has no listing yet; promote it first.");
  });
});
