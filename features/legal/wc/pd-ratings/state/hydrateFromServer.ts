import type {
  WcClaimRead,
  WcInjuryList,
  WcReportRead,
  Side,
} from "../api/types";
import type { ClaimDraft, InjuryDraft, RatingDraft } from "./types";

function readSide(value: unknown): Side {
  if (value === "left" || value === "right") return value;
  return "default";
}

export function hydrateRatingDraft(
  claim: WcClaimRead,
  report: WcReportRead,
  injuries: WcInjuryList,
): RatingDraft {
  const claimDraft: ClaimDraft = {
    applicant_name: (claim as unknown as { applicant_name?: string | null }).applicant_name ?? "",
    occupational_code:
      (claim as unknown as { occupational_code?: number | null }).occupational_code ?? null,
    weekly_earnings:
      (claim as unknown as { weekly_earnings?: number | null }).weekly_earnings ?? null,
    age_at_doi: (claim as unknown as { age_at_doi?: number | null }).age_at_doi ?? null,
    date_of_birth:
      (claim as unknown as { date_of_birth?: string | null }).date_of_birth ?? null,
    date_of_injury:
      (claim as unknown as { date_of_injury?: string | null }).date_of_injury ?? null,
  };

  const injuryDrafts: InjuryDraft[] = injuries.injuries.map((inj) => {
    const raw = inj as unknown as Record<string, unknown>;
    return {
      tmpId: typeof crypto !== "undefined" ? crypto.randomUUID() : `tmp-${Math.random()}`,
      persistedId: (raw.id as string | undefined) ?? undefined,
      impairment_definition_id:
        (raw.impairment_definition_id as string | undefined) ?? null,
      side: readSide(raw.side),
      wpi: (raw.wpi as number | null | undefined) ?? null,
      ue: (raw.ue as number | null | undefined) ?? null,
      le: (raw.le as number | null | undefined) ?? null,
      digit: (raw.digit as number | null | undefined) ?? null,
      pain: (raw.pain as number | undefined) ?? 0,
      industrial: (raw.industrial as number | undefined) ?? 100,
    };
  });

  return {
    claim: claimDraft,
    injuries: injuryDrafts,
    persistedClaimId: claim.id,
    persistedReportId: report.id,
  };
}
