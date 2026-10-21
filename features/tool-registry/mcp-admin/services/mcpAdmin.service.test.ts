const mockCreateClient = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

import {
  getMcpTestNotificationLevel,
  mergeMcpToolAllowlist,
  productsFromColumn,
  productsFromText,
  productsToText,
  updateServerProducts,
  requiresUnrestrictedToolAllowlistConfirmation,
  toolAllowlistFromMetadata,
  updateServerToolAllowlist,
  type McpTestResult,
} from "./mcpAdmin.service";

type BoundaryResponse = { data: unknown; error: unknown };

/**
 * The database boundary the service owns: a current-row read and a versioned
 * update. `mergeJsonColumn` itself stays real, so a green test requires its
 * actual fetch → CAS → refetch/retry sequence to run.
 */
function mcpServerBoundary(
  reads: BoundaryResponse[],
  writes: BoundaryResponse[],
) {
  const readQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
  };
  readQuery.select.mockReturnValue(readQuery);
  readQuery.eq.mockReturnValue(readQuery);
  readQuery.maybeSingle.mockImplementation(() =>
    Promise.resolve(reads.shift() ?? { data: null, error: null }),
  );

  const writeQuery = {
    eq: jest.fn(),
    select: jest.fn(),
    maybeSingle: jest.fn(),
  };
  writeQuery.eq.mockReturnValue(writeQuery);
  writeQuery.select.mockReturnValue(writeQuery);
  writeQuery.maybeSingle.mockImplementation(() =>
    Promise.resolve(writes.shift() ?? { data: null, error: null }),
  );

  const table = {
    select: jest.fn(() => readQuery),
    update: jest.fn(() => writeQuery),
  };
  mockCreateClient.mockReturnValue({
    schema: jest.fn(() => ({ from: jest.fn(() => table) })),
  });
  return { table, writeQuery };
}

const server = {
  id: "541c55c9-2601-4846-a0e6-0b39c4d8d4a8",
  metadata: { stale_note: "opened before a catalog note arrived" },
  version: 7,
};

function result(overrides: Partial<McpTestResult>): McpTestResult {
  return {
    ok: false,
    reachable: false,
    statusCode: null,
    latencyMs: null,
    error: null,
    transport: "streamable_http",
    endpointTested: null,
    message: "Not tested",
    ...overrides,
  };
}

describe("getMcpTestNotificationLevel", () => {
  it("treats a missing endpoint as expected configuration guidance", () => {
    expect(getMcpTestNotificationLevel(result({}))).toBe("info");
  });

  it("treats a stdio test skip as expected guidance", () => {
    expect(getMcpTestNotificationLevel(result({ transport: "stdio" }))).toBe(
      "info",
    );
  });

  it("keeps a failed network probe on the error path", () => {
    expect(
      getMcpTestNotificationLevel(
        result({
          endpointTested: "https://mcp.example.test",
          error: "Timed out",
        }),
      ),
    ).toBe("error");
  });

  it("classifies a reachable endpoint as success", () => {
    expect(
      getMcpTestNotificationLevel(
        result({
          ok: true,
          reachable: true,
          statusCode: 401,
          latencyMs: 20,
          endpointTested: "https://mcp.example.test",
        }),
      ),
    ).toBe("success");
  });
});

describe("MCP tool allowlists", () => {
  beforeEach(() => mockCreateClient.mockReset());

  it("normalizes one tool name per line without storing an empty allowlist", () => {
    expect(
      mergeMcpToolAllowlist(
        { retained: { nested: true }, tool_allowlist: ["old_tool"] },
        "  list_teams\n\nlist_workspaces\nlist_teams  ",
      ),
    ).toEqual({
      retained: { nested: true },
      tool_allowlist: ["list_teams", "list_workspaces"],
    });

    expect(mergeMcpToolAllowlist({ retained: true }, " \n ")).toEqual({
      retained: true,
    });
  });

  it("renders an absent or empty stored allowlist as no editable names", () => {
    expect(toolAllowlistFromMetadata({})).toEqual([]);
    expect(toolAllowlistFromMetadata({ tool_allowlist: [] })).toEqual([]);
  });

  it("requires explicit confirmation for every blank save, including a saved empty list", () => {
    expect(requiresUnrestrictedToolAllowlistConfirmation(" \n ")).toBe(true);
    expect(
      requiresUnrestrictedToolAllowlistConfirmation("search_projects"),
    ).toBe(false);
  });

  it("retries against the fresh row and preserves metadata another writer added", async () => {
    // Break caught: a stale full-json update drops the catalog writer's note.
    const { table, writeQuery } = mcpServerBoundary(
      [
        {
          data: {
            ...server,
            metadata: { onboarding_note: "reviewed by admin" },
            version: 7,
          },
          error: null,
        },
        {
          data: {
            ...server,
            metadata: {
              onboarding_note: "reviewed by admin",
              catalog_revision: "2026-09-28T20:14:00Z",
            },
            version: 8,
          },
          error: null,
        },
        {
          data: {
            ...server,
            metadata: {
              onboarding_note: "reviewed by admin",
              catalog_revision: "2026-09-28T20:14:00Z",
            },
            version: 8,
          },
          error: null,
        },
      ],
      [
        { data: null, error: null },
        {
          data: {
            ...server,
            metadata: {
              onboarding_note: "reviewed by admin",
              catalog_revision: "2026-09-28T20:14:00Z",
              tool_allowlist: ["search_projects", "get_project"],
            },
            version: 9,
          },
          error: null,
        },
      ],
    );

    const saved = await updateServerToolAllowlist(
      server,
      " search_projects\nget_project\nsearch_projects ",
    );

    expect(saved.metadata).toEqual({
      onboarding_note: "reviewed by admin",
      catalog_revision: "2026-09-28T20:14:00Z",
      tool_allowlist: ["search_projects", "get_project"],
    });
    expect(table.update).toHaveBeenNthCalledWith(1, {
      metadata: {
        onboarding_note: "reviewed by admin",
        tool_allowlist: ["search_projects", "get_project"],
      },
      version: 8,
    });
    expect(table.update).toHaveBeenNthCalledWith(2, {
      metadata: {
        onboarding_note: "reviewed by admin",
        catalog_revision: "2026-09-28T20:14:00Z",
        tool_allowlist: ["search_projects", "get_project"],
      },
      version: 9,
    });
    expect(writeQuery.eq).toHaveBeenNthCalledWith(2, "version", 7);
    expect(writeQuery.eq).toHaveBeenNthCalledWith(4, "version", 8);
  });

  it("never reports a missing server as saved", async () => {
    const { table } = mcpServerBoundary(
      [
        { data: { ...server }, error: null },
        { data: null, error: null },
      ],
      [{ data: null, error: null }],
    );

    await expect(
      updateServerToolAllowlist(server, "search_projects"),
    ).rejects.toThrow("no longer available");
    expect(table.update).toHaveBeenCalledTimes(1);
  });

  it("never reports a database failure as saved", async () => {
    const { table } = mcpServerBoundary(
      [{ data: { ...server }, error: null }],
      [{ data: null, error: new Error("permission denied") }],
    );

    await expect(
      updateServerToolAllowlist(server, "search_projects"),
    ).rejects.toThrow("permission denied");
    expect(table.update).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    ["saved_empty_list_is_not_scalar_metadata"],
    "corrupt metadata",
  ])(
    "refuses malformed persisted metadata %p before any update",
    async (metadata) => {
      const { table } = mcpServerBoundary(
        [{ data: { ...server, metadata }, error: null }],
        [],
      );

      await expect(
        updateServerToolAllowlist(server, "search_projects"),
      ).rejects.toThrow("invalid metadata");
      expect(table.update).not.toHaveBeenCalled();
    },
  );

  it("never reports a server that keeps winning the version race as saved", async () => {
    const { table } = mcpServerBoundary(
      [
        { data: { ...server, version: 7 }, error: null },
        { data: { ...server, version: 8 }, error: null },
        { data: { ...server, version: 8 }, error: null },
        { data: { ...server, version: 9 }, error: null },
        { data: { ...server, version: 9 }, error: null },
        { data: { ...server, version: 10 }, error: null },
      ],
      [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
    );

    await expect(
      updateServerToolAllowlist(server, "search_projects"),
    ).rejects.toThrow("kept changing while saving");
    expect(table.update).toHaveBeenCalledTimes(3);
  });
});


describe("search products (tool.mcp_server.products)", () => {
  it("round-trips one product per line, name then its other words", () => {
    const text = "Outlook | mail, email, inbox\nTeams | chat\nWord";
    const products = productsFromText(text);
    expect(products).toEqual([
      { name: "Outlook", aliases: ["mail", "email", "inbox"] },
      { name: "Teams", aliases: ["chat"] },
      { name: "Word", aliases: [] },
    ]);
    expect(productsToText(products)).toBe(text);
  });

  it("saves a repeated name once, trims, drops blank lines, and a blank editor saves no products", () => {
    expect(productsFromText("Jira | tickets, tickets\n\n jira \n  ")).toEqual([{ name: "Jira", aliases: ["tickets"] }]);
    expect(productsFromText("  \n")).toEqual([]);
  });

  it("reads a stored column defensively", () => {
    expect(productsFromColumn(null)).toEqual([]);
    expect(productsFromColumn([{ name: "Jira", aliases: ["tickets", 3] }, { aliases: ["x"] }, "Jira"])).toEqual([
      { name: "Jira", aliases: ["tickets"] },
    ]);
  });

  it("refuses to overwrite products someone else changed since the editor loaded", async () => {
    const mine = { ...server, products: [], version: 4 };
    const theirs = { ...mine, products: [{ name: "Jira", aliases: [] }], version: 5 };
    mcpServerBoundary([{ data: theirs, error: null }], [{ data: null, error: null }]);
    await expect(updateServerProducts(mine as never, "Confluence")).rejects.toThrow(/Someone else changed/);
  });

  it("writes only the products column, compare-and-set on the row version", async () => {
    const current = { ...server, products: [], version: 4 };
    const saved = { ...current, products: [{ name: "Jira", aliases: ["tickets"] }], version: 5 };
    const { table, writeQuery } = mcpServerBoundary([{ data: current, error: null }], [{ data: saved, error: null }]);
    await expect(updateServerProducts(current as never, "Jira | tickets")).resolves.toEqual(saved);
    expect(table.update).toHaveBeenCalledWith({ products: [{ name: "Jira", aliases: ["tickets"] }], version: 5 });
    expect(writeQuery.eq).toHaveBeenCalledWith("version", 4);
  });
});
