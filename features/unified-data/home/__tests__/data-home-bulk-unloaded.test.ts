import { dataHomeBulkActions } from "../dataHomeBulkActions";

describe("Data home bulk Archive never counts an unloaded id as done", () => {
  it("names a ticked id whose row is not loaded", async () => {
    const archiveTable = jest.fn(async () => null);
    const deps = {
      archiveTable,
      archiveForm: jest.fn(),
      restoreTable: jest.fn(),
      restoreForm: jest.fn(),
      isStarred: () => false,
      setStarred: () => [],
      onChanged: jest.fn(),
    };
    const archive = dataHomeBulkActions(deps as never).find((a) => a.id === "archive")!;
    const row = { id: "t1", kind: "table", tableId: "t1", organizationId: "o", archived: false, name: "T" };
    const result = await archive.run(
      { mode: "ids", ids: ["t1", "ghost"], rows: [row], count: 2, filter: {} } as never,
      {},
    );
    expect(archiveTable).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).toContain("Not loaded");
  });
});
