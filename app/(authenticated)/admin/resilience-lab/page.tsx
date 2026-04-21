"use client";

/**
 * Resilience Lab
 *
 * Fires synthetic failures through the real request-recovery + netRequests
 * plumbing so we can verify each edge case is handled end-to-end without
 * waiting for the backend to misbehave.
 *
 * Every scenario below uses the same contract the real agent-run path uses:
 *  - persists to payloadSafetyStore before the mock run fires
 *  - tracks in netRequests
 *  - restores input + pops a retry toast on failure
 *  - deletes the recovery record on success
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  Network,
  Pause,
  Radio,
  Skull,
  Timer,
  WifiOff,
  Zap,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { runTrackedRequest } from "@/lib/redux/net/runTrackedRequest";
import { payloadSafetyStore } from "@/lib/persistence/payloadSafetyStore";
import { resilientFetch } from "@/lib/net/resilient-fetch";
import { monitorStream } from "@/lib/net/stream-monitor";
import {
  ConnectTimeoutError,
  HeartbeatTimeoutError,
  TotalTimeoutError,
} from "@/lib/net/errors";
import { useRequestRecovery } from "@/features/request-recovery";
import { selectActiveNetRequests } from "@/lib/redux/net/selectors";

type RunResult =
  | { ok: true; detail: string }
  | { ok: false; error: string };

function shortId() {
  return `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function runScenario(args: {
  dispatch: ReturnType<typeof useAppDispatch>;
  kind: "agent-run" | "chat" | "api";
  label: string;
  rawUserInput: string;
  restoreInput: (s: string) => void;
  scenario: (ctx: {
    requestId: string;
    abortController: AbortController;
  }) => Promise<void>;
}): Promise<RunResult> {
  const { dispatch, kind, label, rawUserInput, restoreInput, scenario } = args;

  let recoveryId: string | null = null;
  try {
    recoveryId = await payloadSafetyStore.savePending({
      kind,
      label,
      routeHref: "/admin/resilience-lab",
      payload: { scenario: label, ts: Date.now() },
      rawUserInput,
    });
  } catch {
    recoveryId = null;
  }

  const requestId = shortId();
  const abortController = new AbortController();

  try {
    await runTrackedRequest(dispatch, {
      id: requestId,
      kind,
      label,
      recoveryId: recoveryId ?? undefined,
      run: async () => {
        await scenario({ requestId, abortController });
      },
    });
    if (recoveryId) {
      void payloadSafetyStore.markSuccess(recoveryId).catch(() => {});
    }
    return { ok: true, detail: "Succeeded" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    if (recoveryId) {
      void payloadSafetyStore.markFailed(recoveryId, message).catch(() => {});
    }
    restoreInput(rawUserInput);
    toast.error("Simulated failure — input restored, record saved", {
      description: message,
      duration: 6_000,
    });
    return { ok: false, error: message };
  }
}

// ---------- Mock primitives ---------------------------------------------------

/** A ReadableStream that emits NDJSON events on a schedule, with a final behavior. */
function makeMockNdjsonResponse(options: {
  headers?: Record<string, string>;
  events: Array<{ delayMs: number; line: string }>;
  afterLastEvent?: "end" | "silence-forever" | "truncate";
}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const e of options.events) {
        await new Promise((r) => setTimeout(r, e.delayMs));
        controller.enqueue(encoder.encode(e.line + "\n"));
      }
      if (options.afterLastEvent === "silence-forever") {
        // Intentionally never close. The stream just hangs.
        return;
      }
      if (options.afterLastEvent === "truncate") {
        controller.enqueue(encoder.encode('{"kind":"chunk",'));
        controller.close();
        return;
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      ...options.headers,
    },
  });
}

async function consumeNdjsonWithMonitor(
  response: Response,
  abortController: AbortController,
  heartbeatTimeoutMs: number,
  maxLifetimeMs: number,
): Promise<number> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  async function* rawEvents(): AsyncGenerator<unknown> {
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let newlineIdx = buf.indexOf("\n");
      while (newlineIdx !== -1) {
        const line = buf.slice(0, newlineIdx).trim();
        buf = buf.slice(newlineIdx + 1);
        if (line) yield JSON.parse(line);
        newlineIdx = buf.indexOf("\n");
      }
    }
  }

  let count = 0;
  for await (const _ev of monitorStream(rawEvents(), {
    heartbeatTimeoutMs,
    maxLifetimeMs,
    abortController,
  })) {
    count++;
  }
  return count;
}

// ---------- Page -------------------------------------------------------------

const MOCK_USER_INPUT =
  "This is the prompt the user typed before we broke things.";

export default function ResilienceLabPage() {
  const dispatch = useAppDispatch();
  const recovery = useRequestRecovery();
  const activeRequests = useAppSelector(selectActiveNetRequests);

  const [inputValue, setInputValue] = useState(MOCK_USER_INPUT);
  const [log, setLog] = useState<
    Array<{ id: string; ts: string; name: string; result: string }>
  >([]);

  const append = (name: string, result: string) =>
    setLog((l) => [
      { id: shortId(), ts: new Date().toLocaleTimeString(), name, result },
      ...l.slice(0, 49),
    ]);

  const restoreInput = (s: string) => setInputValue(s);

  const scenarios: Array<{
    key: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    expected: string;
    run: () => Promise<RunResult>;
  }> = [
    {
      key: "connect-blackhole",
      title: "1. Connect black hole",
      description:
        "POST to a routable-but-silent host. resilientFetch's connect timeout should fire at 15s.",
      icon: Skull,
      expected: "ConnectTimeoutError after ~15s",
      run: () =>
        runScenario({
          dispatch,
          kind: "api",
          label: "Lab: connect black hole",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            await resilientFetch(
              "http://10.255.255.1/lab",
              { method: "POST" },
              {
                connectTimeoutMs: 5_000,
                totalTimeoutMs: null,
                signal: abortController.signal,
              },
            );
          },
        }),
    },
    {
      key: "headers-then-silence",
      title: "2. Headers then silence",
      description:
        "200 OK with a stream that never emits a single event. Monitor must abort on heartbeat timeout.",
      icon: Radio,
      expected: "HeartbeatTimeoutError after 3s",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: headers-then-silence",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const response = makeMockNdjsonResponse({
              events: [],
              afterLastEvent: "silence-forever",
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              3_000,
              60_000,
            );
          },
        }),
    },
    {
      key: "tab-sleep",
      title: "3. Tab sleep / stream stalls mid-flight",
      description:
        "Stream emits two chunks, then pauses for 10s (beyond heartbeat deadline). Simulates laptop going to sleep.",
      icon: Pause,
      expected: "HeartbeatTimeoutError after 2 events + 4s of silence",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: mid-stream stall",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const response = makeMockNdjsonResponse({
              events: [
                {
                  delayMs: 100,
                  line: '{"kind":"phase","phase":"connected","seq":0}',
                },
                {
                  delayMs: 200,
                  line: '{"kind":"chunk","seq":1,"text":"hello"}',
                },
              ],
              afterLastEvent: "silence-forever",
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              4_000,
              60_000,
            );
          },
        }),
    },
    {
      key: "heartbeat-no-progress",
      title: "4. Heartbeat without progress",
      description:
        "Heartbeats every second forever but zero real events. Tests the absolute lifetime ceiling.",
      icon: Timer,
      expected: "TotalTimeoutError after ~8s lifetime",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: heartbeat-only",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const encoder = new TextEncoder();
            let counter = 0;
            const stream = new ReadableStream<Uint8Array>({
              async pull(controller) {
                await new Promise((r) => setTimeout(r, 1_000));
                counter += 1;
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      kind: "heartbeat",
                      seq: counter,
                      ts: Date.now(),
                    }) + "\n",
                  ),
                );
              },
            });
            const response = new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/x-ndjson" },
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              3_000,
              8_000,
            );
          },
        }),
    },
    {
      key: "truncated-ndjson",
      title: "5. Truncated NDJSON",
      description:
        "Server sends half a JSON line then closes socket cleanly. Should throw, not silently complete.",
      icon: AlertTriangle,
      expected: "JSON parse error",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: truncated NDJSON",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const response = makeMockNdjsonResponse({
              events: [
                {
                  delayMs: 50,
                  line: '{"kind":"phase","phase":"connected","seq":0}',
                },
              ],
              afterLastEvent: "truncate",
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              30_000,
              60_000,
            );
          },
        }),
    },
    {
      key: "offline-toggle",
      title: "6. Offline toggle",
      description:
        "Flip navigator.onLine → false, fire a submit, then bring it back. Verifies netHealth flips and request is blocked.",
      icon: WifiOff,
      expected: "OfflineError (immediate)",
      run: async () => {
        window.dispatchEvent(new Event("offline"));
        const original = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(navigator),
          "onLine",
        );
        Object.defineProperty(navigator, "onLine", {
          configurable: true,
          get: () => false,
        });
        const result = await runScenario({
          dispatch,
          kind: "api",
          label: "Lab: offline submit",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            await resilientFetch(
              "/api/ping-probably-dead",
              { method: "GET" },
              {
                connectTimeoutMs: 5_000,
                totalTimeoutMs: null,
                signal: abortController.signal,
              },
            );
          },
        });
        if (original) {
          Object.defineProperty(navigator, "onLine", original);
        }
        window.dispatchEvent(new Event("online"));
        return result;
      },
    },
    {
      key: "mid-stream-throw",
      title: "7. Mid-stream generator throw",
      description:
        "Emits 3 events, then the iterator throws. Confirms the failure path runs markFailed.",
      icon: Zap,
      expected: "Thrown error surfaced, record saved",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: mid-stream throw",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const encoder = new TextEncoder();
            let n = 0;
            const stream = new ReadableStream<Uint8Array>({
              async pull(controller) {
                await new Promise((r) => setTimeout(r, 120));
                n++;
                if (n > 3) {
                  controller.error(new Error("upstream blew up"));
                  return;
                }
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ kind: "chunk", seq: n, text: "x" }) + "\n",
                  ),
                );
              },
            });
            const response = new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/x-ndjson" },
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              30_000,
              60_000,
            );
          },
        }),
    },
    {
      key: "slow-but-alive",
      title: "8. Slow-but-alive stream (negative test)",
      description:
        "Chunks arrive every 2.5s for 10s, under the 3s heartbeat. Should NOT trigger a timeout.",
      icon: Network,
      expected: "Success — 4 events received",
      run: () =>
        runScenario({
          dispatch,
          kind: "agent-run",
          label: "Lab: slow-but-alive",
          rawUserInput: inputValue,
          restoreInput,
          scenario: async ({ abortController }) => {
            const response = makeMockNdjsonResponse({
              events: [
                { delayMs: 2_500, line: '{"kind":"chunk","seq":1,"text":"a"}' },
                { delayMs: 2_500, line: '{"kind":"chunk","seq":2,"text":"b"}' },
                { delayMs: 2_500, line: '{"kind":"chunk","seq":3,"text":"c"}' },
                {
                  delayMs: 2_500,
                  line: '{"kind":"end","seq":4,"reason":"complete"}',
                },
              ],
              afterLastEvent: "end",
            });
            await consumeNdjsonWithMonitor(
              response,
              abortController,
              4_000,
              60_000,
            );
          },
        }),
    },
  ];

  const [running, setRunning] = useState<string | null>(null);
  const runOne = async (s: (typeof scenarios)[number]) => {
    setRunning(s.key);
    const result = await s.run();
    setRunning(null);
    if ("detail" in result) {
      append(s.title, `OK — ${result.detail}`);
    } else {
      append(s.title, `FAIL (expected): ${result.error}`);
    }
  };

  const fireThreeThenReload = async () => {
    for (const s of scenarios.slice(0, 3)) {
      void s.run();
    }
    toast.info(
      "Three scenarios fired. Reload the page now to see them in the Recovery window.",
    );
  };

  const classifyError = (code: unknown) => {
    if (code instanceof ConnectTimeoutError) return "connect-timeout";
    if (code instanceof HeartbeatTimeoutError) return "heartbeat-timeout";
    if (code instanceof TotalTimeoutError) return "total-timeout";
    return "other";
  };
  void classifyError;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Resilience Lab</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Synthetic failure scenarios for the request-recovery + netRequests
          system. Each button runs through the real guarded-submit plumbing
          (IndexedDB + netRequests + sonner toast) so success here means the
          production path handles the same failure end-to-end.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Simulated user input</CardTitle>
          <CardDescription className="text-xs">
            On failure, each scenario pretends to restore this text into a
            composer. Watch it get cleared then restored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full min-h-[60px] rounded-md border border-border bg-background text-sm p-2"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const isRunning = running === s.key;
          return (
            <Card key={s.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {s.title}
                </CardTitle>
                <CardDescription className="text-xs leading-snug">
                  {s.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="text-[11px] text-muted-foreground">
                  Expected: {s.expected}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runOne(s)}
                  disabled={isRunning}
                  className="self-start"
                >
                  {isRunning ? "Running..." : "Run"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fan-out / reload test</CardTitle>
          <CardDescription className="text-xs">
            Fires three scenarios simultaneously. Reload the page afterwards —
            all three failed submissions should appear in the Recovery window
            with a &quot;new&quot; nudge.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fireThreeThenReload}
          >
            Fire 3 scenarios
          </Button>
          <Button size="sm" variant="ghost" onClick={recovery.open}>
            Open Recovery Window ({recovery.items.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await recovery.deleteAll();
              toast.success("Cleared all recovery entries");
            }}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Live netRequests ({activeRequests.length})
          </CardTitle>
          <CardDescription className="text-xs">
            What the netRequests slice currently sees. Phases come from the
            resilience layer, not the legacy activeRequests tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRequests.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No active requests.
            </div>
          ) : (
            <ul className="text-xs font-mono flex flex-col gap-1">
              {activeRequests.map((r) => (
                <li key={r.id}>
                  [{r.phase}] {r.label} — id={r.id}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Run log</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nothing yet. Run a scenario above.
            </div>
          ) : (
            <ul className="text-xs font-mono flex flex-col gap-1 max-h-72 overflow-y-auto">
              {log.map((row) => (
                <li key={row.id}>
                  <span className="text-muted-foreground">{row.ts}</span>{" "}
                  <span className="font-semibold">{row.name}</span> —{" "}
                  {row.result}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
