/** The compute door to aidream `/data-sources/unlock/compare` (manual; one try = at most one metered request). */

import { postJson } from "@/lib/python-client";

import { parseCompare, type Compare } from "./logic";

export async function compareUrl(opts: { organizationId: string; url: string; signal?: AbortSignal }): Promise<Compare> {
  const { data } = await postJson<unknown, { url: string }>(
    "/data-sources/unlock/compare",
    { url: opts.url },
    { organizationId: opts.organizationId, signal: opts.signal },
  );
  return parseCompare(data);
}
