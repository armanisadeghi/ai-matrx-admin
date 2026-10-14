/**
 * SHAPES-BUGS 3.2: the status strip said "built-in component (broken
 * reference) value_result" on /shapes/json while value_result drew the record
 * right below it. The key is registered by THIS app's host dispatch, so the
 * check must see the host's registrations, not only the package's table.
 */
import { bundledComponentKeyResolves } from "@/features/content-ir/studio/bundled-component-key-resolves";

// NOTE: jest.rich-content-host.setup.ts registers the host dispatch for every
// suite, so the load-order race itself cannot be reproduced here (module
// isolation re-registers global actions and throws). This pins the contract;
// the race was proven live on /shapes/json, before and after.
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  ...jest.requireActual("@/lib/diagnostics/errorCaptureStore"),
  captureError: jest.fn(),
}));

describe("bundledComponentKeyResolves", () => {
  it("a key the host registers (value_result) resolves", async () => {
    await expect(bundledComponentKeyResolves("value_result")).resolves.toBe(true);
  }, 120_000);

  it("a standalone artifact type drawn by the unified stage resolves", async () => {
    await expect(bundledComponentKeyResolves("flashcards")).resolves.toBe(true);
  }, 120_000);

  it("a key nothing draws is still reported missing", async () => {
    await expect(
      bundledComponentKeyResolves("definitely_not_a_component_key_xyz"),
    ).resolves.toBe(false);
  }, 120_000);
});
