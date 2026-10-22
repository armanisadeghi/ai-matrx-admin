/**
 * The two message sources of /chat/on-device (the ONE chat column reads either):
 *
 * 1. `createComputerModelSource` — a local model on one of the person's (or their organization's)
 *    computers, over the relay: `models.llm.chat` streams llama-server's own server-sent events,
 *    turned into the chat's events by the package's `openAiCompatibleToStreamEvents`. The words go
 *    browser ⇄ relay ⇄ computer; no AI Matrx server sees or stores them (`confidential: true`
 *    withholds every diagnostic's text, `database: false` keeps every server-backed control away).
 *    History lives in this tab only, said so.
 *
 * 2. `createClaudePlanSource` — "Claude (your plan)": the first send starts a Claude Code session on
 *    the person's own computer (Code from anywhere, `coding.start`, a Haiku-class model by default,
 *    their own sign-in there), and from then on the coding-sessions package's own transcript feed is
 *    this conversation: the run is projected into the chat as the Sessions view draws it.
 */
import {
  HostSendRefused,
  openAiCompatibleToStreamEvents,
  type ChatMessageSource,
  type HostHistoryPage,
  type HostSourceSink,
  type HostTurn,
} from "@ai-matrx/chat/host";
import type { DesktopClient } from "@ai-matrx/desktop-protocol/client";
import { CODING_SESSION_PERSISTENCE, type CodingSessionsClient } from "@ai-matrx/coding-sessions/react";

/** An async iterable fed by pushes, ended once (the stream's DATA frames). */
function feed(): { push(text: string): void; end(): void; iterable: AsyncIterable<string> } {
  const queue: string[] = [];
  let done = false;
  let wake: (() => void) | null = null;
  const notify = () => {
    const w = wake;
    wake = null;
    w?.();
  };
  return {
    push(text) {
      if (done) return;
      queue.push(text);
      notify();
    },
    end() {
      done = true;
      notify();
    },
    iterable: {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          if (queue.length > 0) {
            yield queue.shift() as string;
            continue;
          }
          if (done) return;
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      },
    },
  };
}

/** The answer text inside llama-server's SSE (delta.content), for this tab's history. */
export function answerTextOf(sse: string): string {
  let out = "";
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data: {")) continue;
    try {
      const chunk = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string | null } }> };
      out += chunk.choices?.[0]?.delta?.content ?? "";
    } catch {
      // A frame split across reads is whole in the joined text; anything else is not answer text.
    }
  }
  return out.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
}

function newId(): string {
  return globalThis.crypto.randomUUID();
}

export interface ComputerModelSourceOptions {
  client: () => DesktopClient;
  modelId: string;
  /** For the refusal sentences ("MacBook Pro is offline"). */
  computerName: string;
  /** Answer length cap per turn (the chat's own default when absent). */
  maxTokens?: number;
}

export function createComputerModelSource(options: ComputerModelSourceOptions): ChatMessageSource {
  const history = new Map<string, Turn[]>();
  const running = new Map<string, { cancel(): void; stop: AbortController }>();
  const turns = (cid: string) => {
    let t = history.get(cid);
    if (!t) history.set(cid, (t = []));
    return t;
  };
  return {
    id: "computer-model",
    confidential: true,
    database: false,
    whileBusy: "refuse",
    persistence: { saved: false, reason: `Kept in this tab only. The words go between this browser and ${options.computerName}; AI Matrx's servers never store them.` },

    async load(conversationId): Promise<HostHistoryPage> {
      return {
        records: turns(conversationId).map((m, i) => ({ id: m.id, role: m.role, content: [{ type: "text", text: m.text }] as never, position: i, createdAt: m.at })),
        hasMoreOlder: false,
      };
    },

    subscribe() {
      // This tab is the only writer: every turn is its own send.
      return () => undefined;
    },

    async send(input, signal): Promise<HostTurn> {
      const client = options.client();
      try {
        await client.ready({ timeoutMs: 10_000 });
      } catch {
        throw new HostSendRefused(`${options.computerName} is not answering. Check that it is on and Matrx 2 is open.`);
      }
      const past = turns(input.conversationId);
      const messages = [...past.map((m) => ({ role: m.role, content: m.text })), { role: "user", content: input.text }];
      const body = feed();
      const stop = new AbortController();
      let raw = "";
      const decoder = new TextDecoder();
      const stream = client.stream(
        "models.llm.chat",
        { model: options.modelId, body: { messages, ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}) }, start_if_stopped: true },
        {
          onData: (payload) => {
            const text = decoder.decode(payload, { stream: true });
            raw += text;
            body.push(text);
          },
        },
      );
      const requestId = stream.id;
      running.set(input.conversationId, { cancel: () => stream.cancel(), stop });
      signal.addEventListener("abort", () => stream.cancel());
      try {
        await stream.result;
      } catch (error) {
        running.delete(input.conversationId);
        const why = error instanceof Error ? error.message : String(error);
        throw new HostSendRefused(`${options.computerName} could not run ${options.modelId}: ${why}`);
      }
      past.push({ id: newId(), role: "user", text: input.text, at: new Date().toISOString() });
      void stream.done.finally(() => {
        running.delete(input.conversationId);
        body.end();
        const answer = answerTextOf(raw);
        if (answer) past.push({ id: newId(), role: "assistant", text: answer, at: new Date().toISOString() });
      });
      return { requestId, events: openAiCompatibleToStreamEvents(body.iterable, { signal: stop.signal, operationId: requestId }) };
    },

    async stop(conversationId) {
      const turn = running.get(conversationId);
      if (!turn) return;
      turn.cancel();
      turn.stop.abort();
    },
  };
}

export interface ClaudePlanSourceOptions {
  coding: CodingSessionsClient;
  /** Starts the session on the computer with this first message; resolves its session id. */
  start(prompt: string): Promise<string>;
}

export function createClaudePlanSource(options: ClaudePlanSourceOptions): ChatMessageSource & { sessionId(): string | null } {
  let sessionId: string | null = null;
  const bound = new Map<string, { sink: HostSourceSink; off: (() => void) | null }>();
  const follow = (id: string) => {
    for (const b of bound.values()) {
      b.off?.();
      b.off = options.coding.transcript(id).subscribe(b.sink);
    }
  };
  return {
    id: "claude-plan",
    whileBusy: "queue",
    database: false,
    persistence: CODING_SESSION_PERSISTENCE,
    sessionId: () => sessionId,
    async load(_conversationId, page) {
      if (!sessionId) return { records: [], hasMoreOlder: false };
      return options.coding.transcript(sessionId).page(Boolean(page));
    },
    subscribe(conversationId, sink) {
      const entry = { sink, off: sessionId ? options.coding.transcript(sessionId).subscribe(sink) : null };
      bound.set(conversationId, entry);
      return () => {
        entry.off?.();
        bound.delete(conversationId);
      };
    },
    async send(input) {
      if (!sessionId) {
        try {
          sessionId = await options.start(input.text);
        } catch (error) {
          throw new HostSendRefused(error instanceof Error ? error.message : String(error));
        }
        follow(sessionId);
        return;
      }
      return options.coding.transcript(sessionId).send(input.text);
    },
    async stop(_conversationId, requestId) {
      if (sessionId) await options.coding.transcript(sessionId).stop(requestId);
    },
  };
}
