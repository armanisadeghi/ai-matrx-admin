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
  const responses = [
    { data: f.call, error: null },
    { data: [f.session], error: null, count: options.duplicate ? 2 : 1 },
    { data: f.chat, error: null },
    {
      data: options.empty
        ? []
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
      count: options.empty
        ? 0
        : options.overflow
          ? 501
          : options.truncated
            ? 4
            : 3,
    },
  ];
  let at = 0;
  const client = {
    schema(schema: string) {
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
      ])
        q[method] = (...args: unknown[]) => {
          calls.push([schema, method, ...args]);
          return q;
        };
      return q;
    },
  } as unknown as Pick<SupabaseClient<Database>, "schema">;
  return { client, calls, f };
}
test("only complete current-call work is summarized, with tool attempts separate from outcomes", async () => {
  const { client, calls, f } = harness();
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
  });
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
