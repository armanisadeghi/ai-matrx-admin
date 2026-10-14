const listForSources = jest.fn();
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { listForSources: (...a: unknown[]) => listForSources(...a) },
}));
jest.mock("@/features/scopes/host/associationsStore", () => ({ getAssociationsStore: jest.fn() }));

import { hydrateNoteContextLinks } from "../noteContextAssociations";

describe("hydrateNoteContextLinks reads each note id once at a time", () => {
  beforeEach(() => listForSources.mockReset());

  it("a second call for ids already in flight shares the read; a later call reads fresh", async () => {
    let release!: () => void;
    listForSources.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, data: { edges: [{ sourceId: "a", targetType: "project", targetId: "p1" }] } });
        }),
    );
    const first = hydrateNoteContextLinks([{ id: "a" }, { id: "b" }]);
    const second = hydrateNoteContextLinks([{ id: "a" }]);
    expect(listForSources).toHaveBeenCalledTimes(1);
    release();
    const [one, two] = await Promise.all([first, second]);
    expect(one[0].project_id).toBe("p1");
    expect(two[0].project_id).toBe("p1");
    expect(listForSources).toHaveBeenCalledTimes(1);

    listForSources.mockImplementationOnce(() => Promise.resolve({ ok: true, data: { edges: [] } }));
    const later = await hydrateNoteContextLinks([{ id: "a" }]);
    expect(listForSources).toHaveBeenCalledTimes(2);
    expect(later[0].project_id).toBeNull();
  });
});
