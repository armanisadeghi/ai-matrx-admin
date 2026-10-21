jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));

import type { LinkedOperation, OperationsByLink } from "@/lib/runtime-operations/operationsByLink";

import { followSyncRun, isSyncWaiting, runningSync, syncRunFailure } from "../notionSyncWaiting";

const PRESS = Date.parse("2026-10-21T10:00:00Z");

function op(status: string, createdAt: string, error: Record<string, unknown> | null = null): LinkedOperation {
  const terminal = ["completed", "failed", "cancelled"].includes(status);
  return {
    execution_id: `${status}-${createdAt}`, request_id: null, root_execution_id: "r", root_request_id: null, type: "utility",
    status, is_terminal: terminal, waiting_input: false, cost: 0, meters: {}, link_kind: "notion_sync", link_id: "t1",
    error, created_at: createdAt, started_at: null, ended_at: null, events_path: "", stream_path: "",
  };
}

function answers(...seq: LinkedOperation[][]) {
  const asked: string[][] = [];
  let i = 0;
  const read = async (kind: string, id: string): Promise<OperationsByLink> => {
    asked.push([kind, id]);
    const operations = seq[Math.min(i++, seq.length - 1)];
    return { link_kind: kind, link_id: id, operation_count: operations.length, operations };
  };
  return { read, asked };
}

const noSleep = async () => undefined;

describe("Sync now while the table's own import runs (server answers 202 waiting)", () => {
  it("recognises the server's waiting answer and not a sync report", () => {
    expect(isSyncWaiting({ status: "waiting", message: "Waiting for the import of Projects to finish" })).toBe(true);
    expect(isSyncWaiting({ added: 1, updated: 0 })).toBe(false);
    expect(isSyncWaiting(null)).toBe(false);
  });

  it("follows the background run on the table's notion_sync link until it settles", async () => {
    const older = op("completed", "2026-10-21T08:00:00Z"); // an earlier sync: never taken for this one
    const { read, asked } = answers([older], [op("running", "2026-10-21T10:00:01Z"), older], [op("completed", "2026-10-21T10:00:01Z"), older]);
    const settled = await followSyncRun("t1", { since: PRESS, read, sleep: noSleep });
    expect(settled?.status).toBe("completed");
    expect(asked).toEqual([["notion_sync", "t1"], ["notion_sync", "t1"], ["notion_sync", "t1"]]);
  });

  it("keeps waiting through a failed read", async () => {
    let n = 0;
    const read = async (kind: string, id: string): Promise<OperationsByLink> => {
      n += 1;
      if (n === 1) throw new Error("blip");
      const operations = [op("completed", "2026-10-21T10:00:02Z")];
      return { link_kind: kind, link_id: id, operation_count: 1, operations };
    };
    expect((await followSyncRun("t1", { since: PRESS, read, sleep: noSleep }))?.status).toBe("completed");
  });

  it("stops when the bar leaves", async () => {
    const stop = new AbortController();
    const { read } = answers([op("running", "2026-10-21T10:00:01Z")]);
    const sleep = async () => stop.abort();
    expect(await followSyncRun("t1", { since: PRESS, read, sleep, signal: stop.signal })).toBeNull();
  });

  it("names a run that did not complete with the server's words", () => {
    expect(syncRunFailure(op("completed", "x"))).toBeNull();
    expect(syncRunFailure(op("failed", "x", { message: "Notion is unreachable." }))).toBe("Notion is unreachable.");
    expect(syncRunFailure(op("failed", "x"))).toBe("The sync did not finish.");
  });

  it("picks a wait up again after a reload", async () => {
    const { read } = answers([op("running", "2026-10-21T10:00:01Z"), op("completed", "2026-10-21T08:00:00Z")]);
    expect((await runningSync("t1", read))?.status).toBe("running");
  });
});
