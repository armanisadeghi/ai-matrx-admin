/**
 * `count` is declared an integer on flashcards.generate_from_source (and the
 * quiz twin). Every caller sends a number — never `String(n)`.
 */
import { renderHook } from "@/test-utils/renderHook";
import { useGenerateCards } from "../useGenerateCards";

const run = jest.fn(async (_args: Record<string, unknown>) => ({}));

jest.mock("@ai-matrx/chat/agents/hooks/useHeadlessAgentJson", () => ({
  useHeadlessAgentJson: () => ({
    run: (args: Record<string, unknown>) => run(args),
    isRunning: false,
    error: null,
    activeRequestId: null,
  }),
}));

const opts = { initiation: "user" } as never;

test("from-source generation sends count as a number", async () => {
  const hook = await renderHook(() => useGenerateCards());
  await hook.current.generate(
    "flashcards.generate_from_source" as never,
    { source_content: "x", count: 12, difficulty: "Mixed" } as never,
    opts,
  );
  const variables = run.mock.calls.at(-1)![0].variables as Record<string, unknown>;
  expect(variables.count).toBe(12);
  expect(typeof variables.count).toBe("number");
});

test("from-topic generation sends count as a number", async () => {
  const hook = await renderHook(() => useGenerateCards());
  await hook.current.generate(
    "flashcards.generate_cards" as never,
    { topic: "t", count: 7, difficulty: "Mixed" } as never,
    opts,
  );
  const variables = run.mock.calls.at(-1)![0].variables as Record<string, unknown>;
  expect(typeof variables.count).toBe("number");
});
