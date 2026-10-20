import { readFileSync } from "node:fs";
import { join } from "node:path";

const warning = jest.fn();
jest.mock("@ai-matrx/chat/host/notify", () => ({ toast: { warning: (...a: unknown[]) => warning(...a) } }));

import { announceSettingsChangedOnSave, settingsChangedOnSave } from "../settings-changed-on-save";

beforeEach(() => warning.mockClear());

describe("the Builder says what the database did to the settings it saved (L46)", () => {
  it("a converted key shows as removed and added", () => {
    expect(settingsChangedOnSave({ image_size: "1k", stream: true }, { resolution: "1k", stream: true })).toBe(
      "Settings changed on save: image_size removed, resolution added.",
    );
  });

  it("a dropped key shows as removed", () => {
    expect(settingsChangedOnSave({ response_mime_type: "application/json", a: 1 }, { a: 1 })).toBe(
      "Settings changed on save: response_mime_type removed.",
    );
  });

  it("same keys, nothing said (value tweaks like integer rounding are not a conversion)", () => {
    expect(settingsChangedOnSave({ max_output_tokens: 40.5 }, { max_output_tokens: 40 })).toBeNull();
    expect(settingsChangedOnSave(null, { a: 1 })).toBeNull();
  });

  it("toasts once, as a warning, only when something changed", () => {
    expect(announceSettingsChangedOnSave({ a: 1 }, { a: 1 })).toBe(false);
    expect(warning).not.toHaveBeenCalled();
    expect(announceSettingsChangedOnSave({ ai_model_id: "m" }, { model_id: "m" })).toBe(true);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][0]).toMatch(/ai_model_id removed, model_id added/);
  });
});

describe("both Builder writes compare and tell, and no alias table lives in TypeScript", () => {
  const src = readFileSync(join(__dirname, "../../redux/builder-write.thunks.ts"), "utf8");
  it("saveAgent and saveAgentField read the settings back and announce", () => {
    expect(src).toMatch(/announceSettingsChangedOnSave\(/);
    expect(src.match(/reconcileSavedSettings\(dispatch/g)?.length).toBe(2);
    expect(src).not.toMatch(/image_size|response_mime_type|ai_model_id/);
  });
});
