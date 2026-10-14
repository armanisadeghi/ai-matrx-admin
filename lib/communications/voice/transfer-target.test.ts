import {
  readVoiceTransferTarget,
  normalizeVoiceTransferTarget,
} from "./transfer-target";
test("saved metadata is consumed without changing its siblings", () => {
  const metadata = {
    voice_transfer_number: "+19497027626",
    keep: { value: "unchanged" },
  };
  expect(readVoiceTransferTarget(metadata)).toBe("+19497027626");
  expect(metadata.keep.value).toBe("unchanged");
});
test.each([
  null,
  [],
  { voice_transfer_number: 1 },
  { voice_transfer_number: "+449497027626" },
])("invalid configured target %o is unavailable", (metadata) =>
  expect(readVoiceTransferTarget(metadata)).toBeNull(),
);
test("formatted US input normalizes and blank clears", () => {
  expect(normalizeVoiceTransferTarget("(949) 702-7626", "+12025550199")).toBe(
    "+19497027626",
  );
  expect(normalizeVoiceTransferTarget(" ", "+12025550199")).toBeNull();
});
test.each(["+449497027626", "please call9497027626", "+12025550199"])(
  "invalid or looping target %s refuses",
  (input) =>
    expect(() => normalizeVoiceTransferTarget(input, "+12025550199")).toThrow(),
);
