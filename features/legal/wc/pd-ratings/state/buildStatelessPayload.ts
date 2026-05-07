import type {
  StatelessCalculate,
  StatelessClaim,
  StatelessInjury,
} from "../api/types";
import { WEEKLY_EARNINGS_MAX } from "../api/types";
import type { ClaimDraft, InjuryDraft, RatingDraft } from "./types";

export interface DraftReadiness {
  ready: boolean;
  reason?: string;
}

export function evaluateDraftReadiness(draft: RatingDraft): DraftReadiness {
  const { claim, injuries } = draft;

  if (!claim.occupational_code)
    return { ready: false, reason: "Select an occupation." };
  if (claim.weekly_earnings == null || claim.weekly_earnings <= 0)
    return { ready: false, reason: "Enter weekly earnings." };
  if (!claim.date_of_injury && claim.age_at_doi == null)
    return {
      ready: false,
      reason: "Add a date of injury or age at injury.",
    };
  if (claim.date_of_injury && !claim.date_of_birth && claim.age_at_doi == null)
    return {
      ready: false,
      reason: "Add a date of birth or age at injury.",
    };
  if (injuries.length === 0)
    return { ready: false, reason: "Add at least one injury." };

  const incomplete = injuries.find((i) => !i.impairment_definition_id);
  if (incomplete)
    return { ready: false, reason: "Choose an impairment for every injury." };

  const noPercent = injuries.find(
    (i) =>
      (i.wpi ?? 0) <= 0 &&
      (i.le ?? 0) <= 0 &&
      (i.ue ?? 0) <= 0 &&
      (i.digit ?? 0) <= 0,
  );
  if (noPercent)
    return {
      ready: false,
      reason: "Each injury needs at least one percentage.",
    };

  return { ready: true };
}

function clampEarnings(weekly: number): number {
  return Math.min(weekly, WEEKLY_EARNINGS_MAX);
}

function buildClaimSection(claim: ClaimDraft): StatelessClaim {
  return {
    occupational_code: claim.occupational_code!,
    weekly_earnings: clampEarnings(claim.weekly_earnings!),
    age_at_doi: claim.age_at_doi ?? undefined,
    date_of_injury: claim.date_of_injury ?? "",
  };
}

function buildInjurySection(injury: InjuryDraft): StatelessInjury {
  const attributes: Record<string, unknown> = { side: injury.side };
  if (injury.wpi != null) attributes.wpi = injury.wpi;
  if (injury.ue != null) attributes.ue = injury.ue;
  if (injury.le != null) attributes.le = injury.le;
  if (injury.digit != null) attributes.digit = injury.digit;

  return {
    impairment_definition_id: injury.impairment_definition_id!,
    attributes: attributes as never,
    pain: injury.pain,
    industrial: injury.industrial,
  };
}

export function buildStatelessPayload(
  draft: RatingDraft,
): StatelessCalculate | null {
  const readiness = evaluateDraftReadiness(draft);
  if (!readiness.ready) return null;

  const { claim, injuries } = draft;
  return {
    applicant: {
      name: claim.applicant_name || "Applicant",
      employee_id: "",
      date_of_birth: claim.date_of_birth ?? "",
    } as never,
    claim: buildClaimSection(claim),
    injuries: injuries.map(buildInjurySection),
  };
}

export function hashDraft(draft: RatingDraft): string {
  const payload = buildStatelessPayload(draft);
  if (!payload) {
    return JSON.stringify({
      _ready: false,
      claim: draft.claim,
      injuries: draft.injuries.length,
    });
  }
  return JSON.stringify(payload);
}
