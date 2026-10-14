/**
 * Smart Add helpers → aidream `/brand-intake/people-search`. The routes are new, so they are called
 * through the python client directly with the shapes declared in ./types (the server's Pydantic models).
 */
import { getJson, postJson } from "@/lib/python-client";
import type { HelperInput, HelperMethod, HelperMethodInfo, HelperResult } from "./types";

const BASE = "/brand-intake/people-search";

function body(input: HelperInput, confirm: boolean, page: number) {
  const t = (s: string) => (s.trim() ? s.trim() : null);
  return { name: input.name.trim(), city: t(input.city), occupation: t(input.occupation), company: t(input.company), confirm, page };
}

export async function listHelperMethods(): Promise<HelperMethodInfo[]> {
  const { data } = await getJson<HelperMethodInfo[]>(`${BASE}/methods`);
  return data;
}

export async function runHelper(method: HelperMethod, input: HelperInput, confirm = false, page = 1): Promise<HelperResult> {
  const { data } = await postJson<HelperResult>(`${BASE}/${method}`, body(input, confirm, page));
  return data;
}

export async function pollLinkedinJob(snapshotId: string): Promise<HelperResult> {
  const { data } = await getJson<HelperResult>(`${BASE}/linkedin/jobs/${encodeURIComponent(snapshotId)}`);
  return data;
}

export async function cancelLinkedinJob(snapshotId: string): Promise<HelperResult> {
  const { data } = await postJson<HelperResult>(`${BASE}/linkedin/jobs/${encodeURIComponent(snapshotId)}/cancel`, {});
  return data;
}
