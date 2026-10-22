import { designBrandFromEdges } from "../design-brand/design-board-brand";

const edge = (o: Partial<{ direction: string; otherType: string; otherId: string; role: string | null }>) => ({ direction: "outgoing", otherType: "web_brand", otherId: "b1", role: "design_system", ...o });

describe("designBrandFromEdges", () => {
  it("finds the design_system edge to a brand", () => {
    expect(designBrandFromEdges([edge({ otherType: "document", otherId: "d" }), edge({})])).toBe("b1");
  });
  it("is null with no such edge", () => {
    expect(designBrandFromEdges([edge({ role: "studio" }), edge({ direction: "incoming" })])).toBeNull();
    expect(designBrandFromEdges([])).toBeNull();
  });
});

jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: {
    add: jest.fn(async () => ({ ok: true, data: {} })),
    remove: jest.fn(async () => ({ ok: true, data: {} })),
    listForEntity: jest.fn(),
  },
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));

describe("writeDesignBoardBrand — every write carries the board's organization", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { associationsService } = require("@/features/scopes/service/associationsService") as {
    associationsService: { add: jest.Mock; remove: jest.Mock };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writeDesignBoardBrand, BOARD_ORG_UNKNOWN } = require("../design-brand/design-board-brand") as typeof import("../design-brand/design-board-brand");
  beforeEach(() => {
    associationsService.add.mockClear();
    associationsService.remove.mockClear();
  });

  it("refuses, touching nothing, when the board's organization is unknown", async () => {
    const r = await writeDesignBoardBrand({ boardId: "bd", brandId: "b2", previousBrandId: "b1", organizationId: null });
    expect(r).toEqual({ ok: false, error: BOARD_ORG_UNKNOWN });
    expect(associationsService.add).not.toHaveBeenCalled();
    expect(associationsService.remove).not.toHaveBeenCalled();
  });

  it("links with the board's organization when it is known", async () => {
    const r = await writeDesignBoardBrand({ boardId: "bd", brandId: "b2", previousBrandId: null, organizationId: "org1" });
    expect(r).toEqual({ ok: true });
    expect(associationsService.add).toHaveBeenCalledWith(expect.objectContaining({ targetId: "b2", orgId: "org1" }));
  });
});
