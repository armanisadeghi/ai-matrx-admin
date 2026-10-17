// features/masterwork/conduct/offerVariables.ts
//
// The `masterwork.conduct` offered values a FRESH Conductor launch holds as
// real facts, sent by name together with the guaranteed rulebook_id / attachments / rulebook_document.
// The launch is on the AGENT door (useAgentLauncher(agentId)); the live Holder
// (Masterwork Conductor) neither declares nor templates any of these names
// (checked live 2026-09-28), so its payload is unchanged. They become mappable
// only after the site moves to the mandate door (owner's call).

import type { MasterworkConductOffer } from "@ai-matrx/agents/generated/provision-offers";
import type { RulebookOfferFacts } from "../agent-context/rulebookDocument";
import { attachmentsVariable, type MasterworkAttachment } from "./service";

/**
 * `rulebook_id`, `attachments` and `rulebook_document` are GUARANTEED offers:
 * the mandate door refuses the run (422 `mandate_inputs_rejected`) without
 * them, so the builder TAKES them and the type keeps them required.
 */
export type ConductOfferValues = Omit<MasterworkConductOffer, "__kind">;

export function conductorOfferVariables(
  rulebookId: string,
  rulebookDocument: string,
  facts: RulebookOfferFacts | null,
  attachments: MasterworkAttachment[],
): ConductOfferValues {
  const out: ConductOfferValues = {
    rulebook_id: rulebookId,
    attachments: attachmentsVariable(attachments),
    rulebook_document: rulebookDocument,
    // A fresh launch is never a resume — ResumedConductorSession never launches.
    is_resumed_session: false,
  };
  const names = attachments.map((a) => a.name).filter((n) => n?.trim());
  if (names.length > 0) out.attachment_names = names;
  if (!facts) return out;
  out.rulebook_name = facts.rulebook_name;
  out.rule_count = facts.rule_count;
  if (facts.rulebook_status) out.rulebook_status = facts.rulebook_status;
  if (facts.rulebook_version !== undefined)
    out.rulebook_version = facts.rulebook_version;
  if (facts.open_feedback) out.open_feedback = facts.open_feedback;
  return out;
}
