/**
 * `AiModelTable.tsx`'s row-level Delete dialog never called the server: its
 * `AlertDialogAction` called `onDelete(item)` directly, and the container's
 * `handleDeleted` (`AiModelsContainer.tsx`) did ONLY
 * `setModels((prev) => prev.filter(...))` — a local-state filter with no
 * backend write. Refreshing the page brought the "deleted" model straight
 * back. Found and flagged (not fixed) by data-doctrine-adoption v5 lane
 * UNDONE-COPY-CENSUS-2 (`spawn_task task_17844c5b`); fixed by lane
 * UNDONE-COPY-CENSUS-3: the confirm now calls `aiModelService.remove(id)`
 * (which moves the `ai.model_definition` row to Trash by setting
 * `deleted_at` — delete means archive, 2026-09-27) and only then calls
 * `onDelete`, with a pending state and `toastWriteFailure` on error.
 *
 * This test renders the exported `ModelRowActions` row-menu component directly
 * (raw `react-dom/client` — no `@testing-library/react` in this
 * repo), clicks Delete then confirms, and asserts the server call happened
 * before `onDelete` fired.
 */
import { moveModelToTrash } from "../AiModelTable";
import type { AiModel } from "../../types";

const removeMock = jest.fn<Promise<void>, [string]>();

jest.mock("../../service", () => ({
  aiModelService: {
    remove: (id: string) => removeMock(id),
  },
}));

function fixtureModel(): AiModel {
  return {
    id: "model-row-1",
    common_name: "Test Model",
    name: "test-model",
  } as unknown as AiModel;
}

describe("AiModelTable row delete (and its bulk twin) reaches the server", () => {
  beforeEach(() => {
    removeMock.mockReset();
    removeMock.mockResolvedValue(undefined);
  });

  it("calls aiModelService.remove with the row's id, then onDelete", async () => {
    const onDelete = jest.fn();
    const model = fixtureModel();
    await moveModelToTrash(model, onDelete);
    expect(removeMock).toHaveBeenCalledWith("model-row-1");
    expect(onDelete).toHaveBeenCalledWith(model);
    // The server call must happen before the local-state callback.
    expect(removeMock.mock.invocationCallOrder[0]).toBeLessThan(onDelete.mock.invocationCallOrder[0]);
  });

  it("does not drop the row locally when the server refuses", async () => {
    removeMock.mockRejectedValue(new Error("Refused"));
    const onDelete = jest.fn();
    await expect(moveModelToTrash(fixtureModel(), onDelete)).rejects.toThrow("Refused");
    expect(onDelete).not.toHaveBeenCalled();
  });
});
