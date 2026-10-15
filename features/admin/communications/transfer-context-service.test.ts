import { contextFixture } from "./__tests__/transfer-context-fixture";
import { projectTransferContexts } from "./transfer-context";
import type { TransferContextEvent } from "./transfer-context";
import { loadTransferContexts } from "./transfer-context-service";
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => mockClient,
}));
const fixtures = [contextFixture(1), contextFixture(2), contextFixture(3)];
let observations: TransferContextEvent[] = [],
  sessions: TransferContextEvent[] = [],
  admin = true;
const queries: Array<{
  key: string;
  eq: jest.Mock;
  in: jest.Mock;
  select: jest.Mock;
  limit: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
}> = [];
const mockClient = {
  rpc: () => ({ abortSignal: async () => ({ data: admin, error: null }) }),
  schema: (schema: string) => ({
    from: (table: string) => {
      let action = "";
      const query: (typeof queries)[number] & {
        abortSignal: () => Promise<{
          data: unknown[];
          error: null;
          count: number;
        }>;
      } = {
        key: `${schema}.${table}`,
        select: jest.fn(() => query),
        eq: jest.fn((key: string, value: string) => {
          if (key === "action") action = value;
          return query;
        }),
        in: jest.fn(() => query),
        order: jest.fn(() => query),
        range: jest.fn(() => query),
        limit: jest.fn(() => query),
        abortSignal: async () => {
          const rows =
            schema === "crm"
              ? fixtures.map((f) => f.call)
              : schema === "chat"
                ? fixtures.map((f) => f.chat)
                : action === "voice.agent.session_reference.consumed"
                  ? sessions
                  : observations;
          return { data: rows, error: null, count: rows.length };
        },
      };
      queries.push(query);
      return query;
    },
  }),
};
beforeEach(() => {
  queries.length = 0;
  admin = true;
  observations = fixtures.flatMap((f, i) =>
    Array.from({ length: i === 0 ? 4 : 3 }, (_, n) => ({
      ...f.observation,
      id: i * 10 + n,
    })),
  );
  sessions = fixtures.map((f) => f.session);
});
test("complete service chain groups ten replays into three exact canonical links", async () => {
  const items = await loadTransferContexts();
  expect(observations).toHaveLength(10);
  expect(items).toHaveLength(3);
  expect(items.map((item) => item.conversationId)).toEqual(
    fixtures.map((f) => f.chat.id),
  );
  const window = queries[0];
  expect(window.limit).toHaveBeenCalledWith(20);
  expect(window.order.mock.calls).toEqual([
    ["occurred_at", { ascending: false }],
    ["id", { ascending: false }],
  ]);
  const bindings = queries.find(
    (q) => q.key === "platform.activity_log" && q !== window,
  );
  expect(bindings?.select).toHaveBeenCalledWith(expect.any(String), {
    count: "exact",
  });
  expect(bindings?.in).toHaveBeenCalledWith(
    "entity_id",
    fixtures.map((f) => f.call.id),
  );
  expect(bindings?.range).toHaveBeenCalled();
  expect(
    queries
      .flatMap((q) => q.eq.mock.calls)
      .every(([key]) => key !== "organization_id"),
  ).toBe(true);
});
test("duplicate or contradictory consumed references cannot choose the first link", async () => {
  sessions.push({ ...fixtures[0].session, id: 1000 });
  expect((await loadTransferContexts())[0].conversationId).toBeNull();
  sessions[sessions.length - 1] = {
    ...fixtures[0].session,
    id: 1000,
    metadata: { chat_conversation_id: fixtures[1].chat.id },
  };
  expect((await loadTransferContexts())[0].conversationId).toBeNull();
});
test("a conflicting callback within the recent window cannot choose a link", () => {
  const first = fixtures[0];
  const projected = projectTransferContexts(
    [
      first.observation,
      { ...first.observation, id: 99, organization_id: fixtures[1].chat.id },
    ],
    [first.call],
    [first.session],
    [first.chat],
  );
  expect(projected).toHaveLength(1);
  expect(projected[0].conversationId).toBeNull();
});
test("admin refusal happens before data reads", async () => {
  admin = false;
  await expect(loadTransferContexts()).rejects.toThrow("administrator");
  expect(queries).toHaveLength(0);
});
