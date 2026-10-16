// `errored` is a recoverable stop with a checkpoint (Resume / Rerun accept it);
// `failed` is finished forever. A surface that gives them one word lies about one.
import { RUN_STATUS_LABEL, runStatusLabel } from "../run-status";
import { runStateLabel } from "../components/run/run-controls";

describe("errored vs failed wording", () => {
  it("run-status labels differ and tell the truth", () => {
    expect(RUN_STATUS_LABEL.failed).toBe("Failed");
    expect(RUN_STATUS_LABEL.errored).toBe("Stopped · can resume");
    expect(runStatusLabel("errored")).not.toBe(runStatusLabel("failed"));
  });

  it("run controls use the same words", () => {
    expect(runStateLabel("errored")).toBe("Stopped · can resume");
    expect(runStateLabel("failed")).toBe("Failed");
  });
});
