/**
 * Full Download looks on the person's computer first: a Matrx 2 computer streams the provider's own
 * file over the relay (`coding.transcript.raw`) and this browser saves it, byte for byte; a
 * computer without it falls through to Matrx Local, then the cloud backup, and every "no" is kept
 * in words. The relay's own client is the double here (its stream: result, data frames, done); the
 * real client over a real core and relay is Matrx 2's test/conformance/coding-remote.test.ts.
 */
import { fullDownloadOne, type RawTranscriptSource } from "../fullDownload";

const saved: Array<{ name: string; text: string }> = [];
const asks: string[] = [];
let computerHas: { file: string; subagents: number; backup: boolean } | null = null;
let localReply: unknown = { found: false, detail: "Matrx Local is not running." };

jest.mock("@ai-matrx/kit/download", () => ({
  downloadFile: (name: string, blob: Blob) => {
    const reader = new FileReader();
    reader.onload = () => saved.push({ name, text: String(reader.result) });
    reader.readAsText(blob);
  },
}));
jest.mock("@/lib/api/call-api", () => ({ callApi: jest.fn() }));
jest.mock("@/features/files/api/files", () => ({ downloadFile: jest.fn(async () => ({ blob: new Blob(["gz"]), filename: "backup.jsonl.gz" })) }));
jest.mock("../matrxLocalRuntime", () => ({ callMatrxLocal: jest.fn(async () => localReply) }));
jest.mock("../matrx2Computers", () => ({
  browserCodingDoors: {
    reach: {
      listComputers: async () => [{ deviceId: "d1", name: "Arman's MacBook Pro", online: true, protocolVersion: "1.40" }],
      withClient: async (_computer: unknown, work: (client: unknown) => Promise<unknown>) =>
        work({
          stream: (op: string, params: { provider_session_id: string }, handlers: { onData: (p: Uint8Array) => void }) => {
            asks.push(`${op}:${params.provider_session_id}`);
            const has = computerHas;
            if (has) for (const part of [has.file.slice(0, 5), has.file.slice(5)]) handlers.onData(new TextEncoder().encode(part));
            return {
              result: Promise.resolve(has ? { available: true, file_name: "chat.jsonl", subagents: has.subagents, backup_refreshed: has.backup } : { available: false, reason: "doesn't have this chat." }),
              done: Promise.resolve("eof"),
              cancel: () => undefined,
            };
          },
        }),
    },
  },
}));

const SOURCE = {
  provider: "claude_code",
  provider_session_id: "p-1",
  native_session_id: "n-1",
  transcript_path: null,
  backup_enabled: false,
  backup_available: false,
  backup_file_id: null,
  backup_sentence: "No cloud backup: the owner has not turned it on.",
} as unknown as RawTranscriptSource;

beforeEach(() => {
  saved.length = 0;
  asks.length = 0;
});

describe("Full Download on a Matrx 2 computer", () => {
  it("saves the computer's own file, names the computer, and says the backup was refreshed", async () => {
    computerHas = { file: '{"a":1}\n{"b":2}\n', subagents: 2, backup: true };
    const result = await fullDownloadOne(SOURCE, null);
    await new Promise((r) => setTimeout(r, 20));
    expect(asks).toEqual(["coding.transcript.raw:n-1"]);
    expect(result.step).toEqual({ kind: "this_computer", savedPath: "chat.jsonl, from Arman's MacBook Pro", subagentStreams: 2, backupNote: "The cloud backup was refreshed too." });
    expect(saved).toEqual([{ name: "chat.jsonl", text: '{"a":1}\n{"b":2}\n' }]);
  });

  it("a computer without the chat falls through to Matrx Local, then says every no", async () => {
    computerHas = null;
    localReply = { found: false, detail: "Matrx Local is not running." };
    const result = await fullDownloadOne(SOURCE, null);
    expect(result.step).toEqual({ kind: "not_available", reasons: ["Arman's MacBook Pro: doesn't have this chat.", "Matrx Local is not running.", "No cloud backup: the owner has not turned it on."] });
    expect(saved).toEqual([]);
  });

  it("Matrx Local still delivers when no Matrx 2 computer has it (nothing old lost)", async () => {
    computerHas = null;
    localReply = { found: true, saved_path: "~/Downloads/chat.jsonl", subagent_streams: 0 };
    const result = await fullDownloadOne(SOURCE, null);
    expect(result.step).toMatchObject({ kind: "this_computer", savedPath: "~/Downloads/chat.jsonl" });
  });
});
