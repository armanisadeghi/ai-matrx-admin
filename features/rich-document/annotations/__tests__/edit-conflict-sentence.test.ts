import { humanError } from "../errors";

describe("someone saved first", () => {
  it("says the text changed and offers no Retry (retrying the same write cannot work)", () => {
    const err = humanError("accepting the suggestion", { code: "PT409", message: "save_reader_edit: this record changed since you opened it (now version 3); reload and accept again" });
    expect(err.message).toBe("Someone changed this text after you opened it, so accepting the suggestion did not go through. Its newest version is reloading — try again on that.");
    expect(err.retryable).toBe(false);
    expect(err.message).not.toMatch(/PT409/);
  });
});
