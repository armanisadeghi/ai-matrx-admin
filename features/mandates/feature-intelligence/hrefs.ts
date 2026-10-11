// features/mandates/feature-intelligence/hrefs.ts
//
// Where a job's intelligence lives. Links are synchronous and carry no
// placement: a job link is `/intelligence?mandate=<key>&<context>`, and the
// server route (`app/(core)/intelligence/page.tsx`) reads the job's node and
// redirects — to `/intelligence/<node slug>`, a lane page, or the research
// topic's own page when the link carries `topicId` and the node is Research
// or below it. A page link is `/intelligence/<slug>`: a registry node slug or
// lane id opens itself; a code feature id (`podcast`, `marketing`) resolves on
// the server to the node its jobs share. Every context value rides along.

import type { IntelligenceContext } from "./types";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

/** The registry node that owns research topics' own intelligence page. */
export const RESEARCH_NODE = "research";

/** The research topic's own intelligence page. */
export function topicIntelligenceHref(topicId: string, params?: URLSearchParams): string {
  const base = `/research/topics/${encodeURIComponent(topicId)}/intelligence`;
  const query = params?.toString();
  return query ? `${base}?${query}` : base;
}

function withQuery(base: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function contextParams(context: IntelligenceContext | undefined, skip?: string): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(context ?? {})) {
    if (value && name !== skip) params.set(name, value);
  }
  return params;
}

/** One job's page: the server resolves its node and redirects. */
export function intelligenceHref(
  mandateKey: AnyMandateKey,
  context?: IntelligenceContext,
): string {
  const params = new URLSearchParams();
  params.set("mandate", mandateKey);
  for (const [name, value] of contextParams(context)) params.set(name, value);
  return withQuery("/intelligence", params);
}

/** A page by its slug (node slug, lane id, or code feature id), or one job on it. */
export function featureIntelligenceHref(
  featureSlug: string,
  options: { mandateKey?: AnyMandateKey | null; context?: IntelligenceContext } = {},
): string {
  if (options.mandateKey) return intelligenceHref(options.mandateKey, options.context);
  const topicId = options.context?.topicId;
  if (featureSlug === RESEARCH_NODE && topicId) {
    return topicIntelligenceHref(topicId, contextParams(options.context, "topicId"));
  }
  if (!featureSlug) return "/intelligence";
  return withQuery(
    `/intelligence/${encodeURIComponent(featureSlug)}`,
    contextParams(options.context),
  );
}
