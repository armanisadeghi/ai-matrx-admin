// features/ai-test-mode/service.ts — the aidream AI test mode doors
// (rules: common-docs/policies/ai-test-mode.md). Every call rides
// lib/python-client, so it carries this tab's X-Matrx-AI-Test-Mode.

import { del, getJson, patchJson, putJson } from "@/lib/python-client";
import type { AiTestMode } from "@/lib/api/ai-test-mode";

export interface AiTestModeStatus {
  requested: AiTestMode;
  effective: AiTestMode;
  reason: string;
  /** The server allows test modes AND this caller may use them. */
  available: boolean;
  server_reason: string;
  modes: string[];
}

export interface AiTestBaseline {
  id: string;
  provider: string;
  mandate_key: string | null;
  endpoint: string | null;
  label: string | null;
  stand_in: boolean;
  saved_at: string | null;
  recorded_in_run: string | null;
  original_cost_usd: number | null;
  hit_count: number;
  saved_usd: number | null;
  last_replayed_at: string | null;
  used_by: unknown;
  fingerprint: string | null;
}

export interface AiTestReportItem {
  key: string;
  baselines: number;
  replays: number;
  saved_usd: number;
  runs: number;
  users: number;
}

export interface AiTestReport {
  total_saved_usd: number;
  total_replays: number;
  items: AiTestReportItem[];
}

export async function fetchAiTestModeStatus(signal?: AbortSignal): Promise<AiTestModeStatus> {
  const { data } = await getJson<AiTestModeStatus>("/ai-test-mode/status", {
    signal,
    captureErrors: false,
  });
  return data;
}

const ADMIN = "/admin/ai-test-mode";

export async function listAiTestBaselines(
  opts: { mandateKey?: string; includeProviderCalls?: boolean } = {},
): Promise<AiTestBaseline[]> {
  const params = new URLSearchParams();
  if (opts.mandateKey) params.set("mandate_key", opts.mandateKey);
  if (opts.includeProviderCalls) params.set("include_provider_calls", "true");
  const qs = params.toString();
  const { data } = await getJson<{ baselines: AiTestBaseline[] }>(
    `${ADMIN}/baselines${qs ? `?${qs}` : ""}`,
  );
  return data.baselines;
}

export async function patchAiTestBaseline(
  id: string,
  body: { label?: string | null; stand_in?: boolean },
): Promise<AiTestBaseline> {
  const { data } = await patchJson<AiTestBaseline>(
    `${ADMIN}/baselines/${encodeURIComponent(id)}`,
    body,
  );
  return data;
}

export async function archiveAiTestBaseline(id: string): Promise<void> {
  await del(`${ADMIN}/baselines/${encodeURIComponent(id)}`);
}

export async function setAiTestStandIn(
  mandateKey: string,
  body: { label?: string; result: Record<string, unknown> },
): Promise<AiTestBaseline> {
  const { data } = await putJson<AiTestBaseline>(
    `${ADMIN}/stand-ins/${encodeURIComponent(mandateKey)}`,
    body,
  );
  return data;
}

export async function fetchAiTestReport(): Promise<AiTestReport> {
  const { data } = await getJson<AiTestReport>(`${ADMIN}/report`);
  return data;
}
