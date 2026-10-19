/** Re-clean asks first only for an already-cleaned doc; cancel sends nothing. */
import { confirmRecleanIfCleaned } from "../confirmReclean";

const confirmMock = jest.fn();
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({
  confirm: (o: unknown) => confirmMock(o),
}));

beforeEach(() => confirmMock.mockReset());

it("a not-cleaned doc runs with no question", async () => {
  expect(await confirmRecleanIfCleaned(false)).toBe(true);
  expect(confirmMock).not.toHaveBeenCalled();
});

it("a cleaned doc asks with the consequence, and yes proceeds", async () => {
  confirmMock.mockResolvedValue(true);
  expect(await confirmRecleanIfCleaned(true)).toBe(true);
  expect(confirmMock).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Re-clean this document?",
      description: "This replaces the current clean text.",
      confirmLabel: "Re-clean",
      cancelLabel: "Cancel",
    }),
  );
});

it("cancel answers false so the caller sends nothing", async () => {
  confirmMock.mockResolvedValue(false);
  expect(await confirmRecleanIfCleaned(true)).toBe(false);
});
