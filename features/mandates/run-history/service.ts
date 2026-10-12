// features/mandates/run-history/service.ts
//
// THE ONE READ of run history — `mandate.run_history` — lives in the agents package now:
// `@ai-matrx/agents/mandates/runs` (moved 2026-10-12 so the desktop app's Agents › an agent ›
// Runs reads the same rows through the same parser). This file is the web's adapter only: it
// passes the web's own supabase client and carries a refusal in the mandate doors' one shape
// (MandateRunHistoryError, a MandateDoorError), so every screen prints the database's own words.
//
// Views are SEATS, and the database checks each one:
//   mine      the caller's own runs          (a member)
//   org       every run in one organization  (its owner/admin)
//   platform  every run on the platform      (admin section only — never "mine")

import {
  RUN_STATUSES,
  RunHistoryReadError,
  fetchRuns as fetchRunsFromPackage,
  parseRunPage,
  readableError,
  type MandateRun,
  type MandateRunPage,
  type RunFacet,
  type RunHistoryClient,
  type RunHistoryView,
  type RunRung,
  type RunSort,
  type RunStatus,
  type RunsQuery as PackageRunsQuery,
} from "@ai-matrx/agents/mandates/runs";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

import { supabase } from "@/utils/supabase/client";
import { MandateDoorError } from "../door-error";

export { RUN_STATUSES, parseRunPage, readableError };
export type { MandateRun, MandateRunPage, RunFacet, RunHistoryView, RunRung, RunSort, RunStatus };

export interface MandateRunQuery {
  mandateKey: AnyMandateKey;
  view: RunHistoryView;
  organizationId?: string | null;
  userId?: string | null;
  status?: RunStatus | null;
  limit?: number;
  offset?: number;
}

export class MandateRunHistoryError extends MandateDoorError {
  constructor(init: { message: string; code?: string | null; detail?: string | null; hint?: string | null }) {
    super({
      ...init,
      name: "MandateRunHistoryError",
      fallback: "The run history could not be read and the database gave no reason.",
    });
  }
}

export interface RunsQuery extends Omit<MandateRunQuery, "mandateKey"> {
  scope: { mandateKey: AnyMandateKey } | { agentId: string };
  sort?: RunSort;
  descending?: boolean;
}

export function fetchMandateRuns(query: MandateRunQuery): Promise<MandateRunPage> {
  return fetchRuns({ ...query, scope: { mandateKey: query.mandateKey } });
}

export async function fetchRuns(query: RunsQuery): Promise<MandateRunPage> {
  try {
    return await fetchRunsFromPackage(supabase as unknown as RunHistoryClient, query as PackageRunsQuery);
  } catch (error) {
    if (error instanceof RunHistoryReadError) {
      throw new MandateRunHistoryError({ message: error.message, code: error.code, detail: error.detail, hint: error.hint });
    }
    throw error;
  }
}
