"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsAuthenticated,
  selectUserId,
} from "@/lib/redux/slices/userSlice";
import { callApi, type ApiCallResult } from "@/lib/api/call-api";
import {
  useCalculateReport,
  useCreateClaim,
  useEnsureReport,
} from "../api/hooks";
import { useUpsertBookmark } from "../api/bookmarks";
import { extractApiError, type WcInjuryRead } from "../api/types";
import {
  claimDraftToCreate,
  injuryDraftToCreate,
} from "./buildPersistencePayloads";
import type { RatingDraft } from "./types";

export type SaveStep =
  | "claim"
  | "report"
  | "injuries"
  | "calculate"
  | "bookmark";

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving"; step: SaveStep }
  | { kind: "saved"; claimId: string; reportId: string }
  | { kind: "error"; message: string }
  | { kind: "needs_login" };

export interface SaveResult {
  claimId: string;
  reportId: string;
  injuryIds: Record<string, string>;
}

export function useSaveCase() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const isAuthed = useAppSelector(selectIsAuthenticated);

  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const createClaim = useCreateClaim();
  const ensureReport = useEnsureReport();
  const calculate = useCalculateReport();
  const upsertBookmark = useUpsertBookmark();

  const save = useCallback(
    async (draft: RatingDraft): Promise<SaveResult | null> => {
      if (!isAuthed || !userId) {
        setStatus({ kind: "needs_login" });
        return null;
      }

      try {
        setStatus({ kind: "saving", step: "claim" });
        const claim = await createClaim.mutateAsync(
          claimDraftToCreate(draft.claim),
        );

        setStatus({ kind: "saving", step: "report" });
        const report = await ensureReport(claim.id);

        setStatus({ kind: "saving", step: "injuries" });
        const injuryIds: Record<string, string> = {};
        for (const injury of draft.injuries) {
          const result = (await dispatch(
            callApi({
              path: "/legal/wc/ratings/reports/{report_id}/injuries" as never,
              method: "POST",
              pathParams: { report_id: report.id } as never,
              body: injuryDraftToCreate(injury) as never,
            }),
          )) as ApiCallResult<WcInjuryRead>;
          if (result.error) {
            const detail = extractApiError(result.error.serverDetail);
            throw new Error(detail?.message ?? result.error.message);
          }
          injuryIds[injury.tmpId] = result.data!.id;
        }

        setStatus({ kind: "saving", step: "calculate" });
        await calculate.mutateAsync(report.id);

        setStatus({ kind: "saving", step: "bookmark" });
        await upsertBookmark.mutateAsync({
          userId,
          claimId: claim.id,
          label: draft.claim.applicant_name || null,
        });

        setStatus({ kind: "saved", claimId: claim.id, reportId: report.id });
        return { claimId: claim.id, reportId: report.id, injuryIds };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        setStatus({ kind: "error", message });
        return null;
      }
    },
    [
      calculate,
      createClaim,
      dispatch,
      ensureReport,
      isAuthed,
      upsertBookmark,
      userId,
    ],
  );

  const reset = useCallback(() => setStatus({ kind: "idle" }), []);

  return { status, save, reset, isAuthed };
}
