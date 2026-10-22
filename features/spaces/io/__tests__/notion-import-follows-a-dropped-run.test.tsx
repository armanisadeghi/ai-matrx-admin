/**
 * ADVERSARIAL-8 F3: the Notion import dialog said "The connection dropped … reconnecting to it now" for 20+
 * minutes while the import had already finished on the server — nothing ever reconnected; the transport's
 * sentence was printed as the import's end. A dropped stream now follows the import's run (by the request id
 * the dialog sent) to the server's real state: finished → the report; failed → why.
 * Break it (print the transport error, forget the request id, read anything but the run) and these go red.
 */
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

const sentIds: Array<string | undefined> = [];
let script: "drop" | "drop-before-any-event" | "refused" = "drop";

jest.mock("@/lib/python-client", () => ({
  newRequestId: () => "req-fixed-1",
  postNdjson: (_path: string, _body: unknown, opts: { requestId?: string }) => {
    sentIds.push(opts?.requestId);
    return (async function* () {
      if (script === "refused") throw new Error("Choose the organization to bring Notion into.");
      if (script === "drop") yield { event: "data", data: { type: "notion_import.progress", step: "report", done: 1, total: 1, detail: "" } };
      const { StreamTransportError } = jest.requireActual("@ai-matrx/api");
      throw new StreamTransportError("The connection dropped. Your run is still going on the server — reconnecting to it now.");
    })();
  },
}));

const follow = jest.fn();
jest.mock("../notionImportRejoin", () => ({ followImportRun: (...a: unknown[]) => follow(...a) }));
jest.mock("@/features/files/handler/hooks/useFileUpload", () => ({ useFileUpload: () => ({ upload: jest.fn() }) }));
jest.mock("@/features/secrets/vault-service", () => ({ createVaultItem: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/connectors/useConnectMcpServer", () => ({ useConnectMcpServer: () => ({ connect: jest.fn(), connectingSlug: null }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => undefined }));
jest.mock("../../state/SpacesProvider", () => ({ useSpaces: () => ({}) }));

import { useNotionImport } from "../NotionImport";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type State = ReturnType<typeof useNotionImport>;
async function run(): Promise<State> {
  let state: State | null = null;
  function Probe() {
    state = useNotionImport();
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => root.render(<Probe />));
  await act(async () => {
    await (state as unknown as State).chooseConnection();
  });
  (state as unknown as State).setLink("https://www.notion.so/Courses-0123456789abcdef0123456789abcdef");
  act(() => root.render(<Probe />));
  await act(async () => {
    await (state as unknown as State).fromConnection();
  });
  return state as unknown as State;
}

const finished = { type: "notion_import.finished", run: "Notion — Courses", counts: { tables: 1 }, report_table_id: "t1", came_over: { tables: 1 }, came_with_a_difference: [], not_carried: [], top_pages: ["p1"] };

beforeEach(() => {
  sentIds.length = 0;
  follow.mockReset();
});

it("a stream that drops after the import began shows the server's finished report, read from the run", async () => {
  script = "drop";
  follow.mockResolvedValue({ kind: "end", end: finished });
  const state = await run();
  expect(sentIds).toEqual(["req-fixed-1"]);
  expect(follow).toHaveBeenCalledWith("req-fixed-1");
  expect(state.stage).toMatchObject({ phase: "finished", report: { run: "Notion — Courses", top_pages: ["p1"], report_table_id: "t1" } });
});

it("a run that failed on the server says why, never the transport's 'reconnecting'", async () => {
  script = "drop-before-any-event";
  follow.mockResolvedValue({ kind: "end", end: { type: "notion_import.failed", message: "Postgres canceled this statement." } });
  const state = await run();
  expect(state.stage).toEqual({ phase: "failed", message: "Postgres canceled this statement." });
});

it("a refusal before the stream opened is said as it is (no run to follow)", async () => {
  script = "refused";
  const state = await run();
  expect(follow).not.toHaveBeenCalled();
  expect(state.stage).toEqual({ phase: "failed", message: "Choose the organization to bring Notion into." });
});
