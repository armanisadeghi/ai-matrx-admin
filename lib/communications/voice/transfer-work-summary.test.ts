/** @jest-environment node */
import { readTransferWorkSummary } from "./transfer-work-summary";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { contextFixture } from "@/features/admin/communications/__tests__/transfer-context-fixture";
function harness(
  options: {
    truncated?: boolean;
    wrongActor?: boolean;
    empty?: boolean;
    badTools?: boolean;
    unknownStatus?: boolean;
    duplicate?: boolean;
    badSession?: boolean;
    overflow?: boolean;
    wrongOrg?: boolean;
    toolCount?: number | null;
    toolError?: boolean;
    toolUnknown?: boolean;
    batchRequests?: boolean;
  } = {},
) {
  const f = contextFixture();
  f.session.metadata = {
    ...(f.session.metadata as object),
    session_id: f.call.id,
  };
  if (options.badSession)
    f.session.metadata = {
      ...(f.session.metadata as object),
      session_id: "bad",
    };
  if (options.wrongOrg) f.chat.organization_id = f.call.id;
  if (options.wrongActor) f.chat.created_by = f.call.id;
  const calls: unknown[][] = [];
  const queries: { schema: string; table: string; calls: unknown[][] }[] = [];
  const responses = [
    { data: f.call, error: null },
    { data: [f.session], error: null, count: options.duplicate ? 2 : 1 },
    { data: f.chat, error: null },
    {
      data: options.empty
        ? []
        : options.batchRequests
          ? Array.from({ length: 26 }, (_, i) => ({
              id: String(i + 1),
              status: "completed",
              total_tool_calls: 0,
            }))
          : [
              { id: "1", status: "completed", total_tool_calls: 2 },
              { id: "2", status: "failed", total_tool_calls: 1 },
              {
                id: "3",
                status: options.unknownStatus ? "unknown" : "processing",
                total_tool_calls: options.badTools ? -1 : 0,
              },
            ],
      error: null,
      count: options.batchRequests
        ? 26
        : options.empty
          ? 0
          : options.overflow
            ? 501
            : options.truncated
              ? 4
              : 3,
    },
    {
      data: [
        {
          id: "tool1",
          user_request_id: "1",
          status: "completed",
          success: true,
          is_error: false,
          tool_name: "calendar.lookup",
        },
        {
          id: "tool2",
          user_request_id: "1",
          status: options.toolUnknown ? "unknown" : "error",
          success: true,
          is_error: true,
          tool_name: "calendar.create_event",
        },
        {
          id: "tool3",
          user_request_id: "2",
          status: "delegated",
          success: false,
          is_error: false,
          tool_name: "message.send",
        },
      ],
      error: options.toolError ? { message: "private" } : null,
      count: options.toolCount === undefined ? 3 : options.toolCount,
    },
  ];
  if (options.batchRequests)
    responses.push({
      data: [
        {
          id: "tool4",
          user_request_id: "26",
          status: "error",
          success: false,
          is_error: true,
          tool_name: "calendar.remove",
        },
      ],
      error: null,
      count: 1,
    } as (typeof responses)[number]);
  let at = 0;
  const client = {
    schema(schema: string) {
      const query = { schema, table: "", calls: [] as unknown[][] };
      queries.push(query);
      const q = {
        then(resolve: (v: unknown) => unknown) {
          return Promise.resolve(responses[at++]).then(resolve);
        },
      } as Record<string, unknown>;
      for (const method of [
        "from",
        "select",
        "eq",
        "is",
        "abortSignal",
        "maybeSingle",
        "limit",
        "order",
        "contains",
        "in",
      ])
        q[method] = (...args: unknown[]) => {
          const entry = [schema, method, ...args];
          calls.push(entry);
          query.calls.push(entry);
          if (method === "from") query.table = String(args[0]);
          return q;
        };
      return q;
    },
  } as unknown as Pick<SupabaseClient<Database>, "schema">;
  return { client, calls, queries, f };
}
test("only complete current-call work is summarized, with tool attempts separate from outcomes", async () => {
  const { client, calls, queries, f } = harness();
  expect(
    await readTransferWorkSummary(
      client,
      f.call.provider_account_id ?? "",
      f.call.provider_interaction_id ?? "",
    ),
  ).toEqual({
    requests: 3,
    completed: 1,
    failed: 1,
    unfinished: 1,
    toolCalls: 3,
    toolOutcomes: {
      recorded: 3,
      returnedWithoutError: 1,
      reportedErrors: 1,
      unconfirmed: 1,
      failedToolNames: ["calendar create event"],
    },
  });
  const requestQuery = queries.filter(
    (query) => query.schema === "chat" && query.table === "user_request",
  );
  const toolQueries = queries.filter(
    (query) => query.schema === "chat" && query.table === "tool_call",
  );
  expect(requestQuery).toHaveLength(1);
  expect(toolQueries).toHaveLength(1);
  for (const query of [...requestQuery, ...toolQueries])
    expect(query.calls).toEqual(
      expect.arrayContaining([
        ["chat", "eq", "conversation_id", f.chat.id],
        ["chat", "eq", "organization_id", f.call.organization_id],
        ["chat", "eq", "created_by", f.call.recording_owner_id],
        ["chat", "is", "deleted_at", null],
      ]),
    );
  expect(requestQuery[0].calls).toEqual(
    expect.arrayContaining([
      ["chat", "eq", "source_app", "aidream"],
      ["chat", "eq", "source_feature", "voice-agent"],
      [
        "chat",
        "contains",
        "metadata",
        {
          voice_session_id: f.call.id,
          voice_interaction_id: f.call.id,
          voice_provider_call_id: f.call.provider_interaction_id,
        },
      ],
    ]),
  );
  expect(toolQueries[0].calls).toEqual(
    expect.arrayContaining([
      ["chat", "in", "user_request_id", ["1", "2", "3"]],
      [
        "chat",
        "select",
        "id,user_request_id,status,success,is_error,tool_name",
        { count: "exact" },
      ],
    ]),
  );
  expect(calls).toEqual(
    expect.arrayContaining([
      [
        "chat",
        "contains",
        "metadata",
        {
          voice_session_id: f.call.id,
          voice_interaction_id: f.call.id,
          voice_provider_call_id: f.call.provider_interaction_id,
        },
      ],
      ["chat", "eq", "created_by", f.call.recording_owner_id],
      ["chat", "eq", "organization_id", f.call.organization_id],
      ["chat", "eq", "source_feature", "voice-agent"],
      ["chat", "eq", "source_app", "aidream"],
      ["crm", "eq", "provider_account_id", f.call.provider_account_id],
      ["crm", "eq", "provider_interaction_id", f.call.provider_interaction_id],
      ["chat", "eq", "conversation_id", f.chat.id],
      ["chat", "in", "user_request_id", ["1", "2", "3"]],
      ["chat", "is", "deleted_at", null],
      [
        "chat",
        "select",
        "id,user_request_id,status,success,is_error,tool_name",
        { count: "exact" },
      ],
    ]),
  );
});
test.each([
  { truncated: true },
  { wrongActor: true },
  { empty: true },
  { badTools: true },
  { unknownStatus: true },
  { duplicate: true },
  { badSession: true },
  { overflow: true },
  { wrongOrg: true },
])("incomplete or misbound work withholds summary: %j", async (options) => {
  const { client, f } = harness(options);
  expect(
    await readTransferWorkSummary(
      client,
      f.call.provider_account_id ?? "",
      f.call.provider_interaction_id ?? "",
    ),
  ).toBeNull();
});
test("absent parent identity performs no database lookup", async () => {
  const { client, calls } = harness();
  expect(await readTransferWorkSummary(client, "", "")).toBeNull();
  expect(calls).toHaveLength(0);
});

test.each([
  { toolError: true },
  { toolCount: null },
  { toolCount: 501 },
  { toolCount: 2 },
  { toolUnknown: true },
])(
  "tool detail refusal preserves known request summary: %j",
  async (options) => {
    const { client, f } = harness(options);
    const result = await readTransferWorkSummary(
      client,
      f.call.provider_account_id ?? "",
      f.call.provider_interaction_id ?? "",
    );
    expect(result).toEqual({
      requests: 3,
      completed: 1,
      failed: 1,
      unfinished: 1,
      toolCalls: 3,
      toolOutcomes: null,
    });
  },
);

test("a large request snapshot keeps every tool query URL bounded without losing the last request", async () => {
  const { client, calls, f } = harness({ batchRequests: true });
  const result = await readTransferWorkSummary(
    client,
    f.call.provider_account_id ?? "",
    f.call.provider_interaction_id ?? "",
  );
  const batches = calls
    .filter((row) => row[1] === "in")
    .map((row) => row[3] as string[]);
  expect(batches.map((ids) => ids.length)).toEqual([25, 1]);
  expect(batches.flat()).toEqual(
    Array.from({ length: 26 }, (_, i) => String(i + 1)),
  );
  expect(result?.toolOutcomes).toEqual({
    recorded: 4,
    returnedWithoutError: 1,
    reportedErrors: 2,
    unconfirmed: 1,
    failedToolNames: ["calendar create event", "calendar remove"],
  });
});
