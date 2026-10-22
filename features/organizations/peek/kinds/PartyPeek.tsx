"use client";

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
/**
 * PartyPeek — "wait, which Dana is that?" for a Person (or company) in the CRM.
 *
 * 🚨 F-40. The `party` token had no peek at all, so every surface that names a
 * Person — the approvals queue's contact-import card first among them — could
 * only send the reader to `/crm/<id>`, out of whatever they were doing. The
 * generic `RegistryPeek` would have answered with the name, the row column for who sees it and two
 * dates: nothing that tells two same-named People apart. The question a reader
 * actually asks is *which* person, and the answer is the job title, the employer
 * and the contact values, which is why this kind earns a bespoke peek (see the
 * rule in `@ai-matrx/records-ui/entity-doors`).
 *
 * It is NOT a second Person renderer: the read is the canonical
 * `fetchPartyDetail` (the same bundle the record page loads, org-scoped through
 * RLS on `crm.*`), the contact value and its reachability come from the same
 * helpers the record page's Contact card uses, and the chrome is THE peek (`Peek` in `PeekWindow`), whose doors resolve the full record's route from the entity
 * registry. The 360° workspace stays at `/crm/<id>`; the in-place window/docked
 * dossier is the Detail primitive (`features/item-presentation/registry.tsx`).
 */

import React from "react";
import { Building2, Contact, User } from "lucide-react";
import { Peek, PeekWindow, type PeekBlock, type PeekRow } from "@ai-matrx/design-system";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { fetchPartyDetail } from "@/features/crm/service";
import { describeBlocks, mediumBlocks } from "@/features/crm/reachability";
import { partyKindWord } from "@/features/crm/party-words";
import type { PartyDetail } from "@/features/crm/types";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

/** The employer line: the current affiliation, else the denormalised employer. */
function employerLine(detail: PartyDetail): string | null {
  const current = detail.affiliations.find((a) => a.is_current) ?? null;
  const name = current?.employer?.display_name ?? detail.party.employer?.display_name ?? null;
  if (!name) return null;
  const role = current?.title?.trim() || detail.party.job_title?.trim() || null;
  return role ? `${role} at ${name}` : name;
}

/** `channel_code` in the person's words. The timeline's icon map is its own. */
function channelWords(code: string | null | undefined): string {
  const raw = (code ?? "").trim();
  if (!raw) return "Activity";
  return humanizeIdentifier(raw) || raw;
}

export default function PartyPeek({ id, open, onClose }: PeekProps) {
  const [detail, setDetail] = React.useState<PartyDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const doors = useRecordPeekDoors({ token: "party", id, onClose });
  // A read that FAILED is not a record that is not there — the gate below says
  // which, and never reports an empty Person for data we could not read.
  // 🚨 The thrown error OBJECT is kept, never flattened to its `.message`:
  // `fetchPartyDetail` throws `RecordUnavailableError` on a zero-row/RLS miss,
  // and only `classifyDataError` (fed the real object) can tell that apart from
  // a transient fault — a bare string always reads as a fault (Bugbot #4042337969).
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPartyDetail(id);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const party = detail?.party ?? null;
  const isPerson = party?.party_kind === "person";
  const isCompany = party?.party_kind === "organization";
  // 🚨 N6 (VERIFY-U-P1-R5) — the word for THIS record, from the ONE resolver.
  // The title used to fall back to "Person" whenever the name was missing, so a
  // company with no display name — and EVERY record for the length of the load
  // — was titled "Person" in the peek. An unknown or not-yet-loaded kind reads
  // the honest generic word.
  const kindWord = partyKindWord(party?.party_kind);
  const KindIcon = isPerson ? User : isCompany ? Building2 : Contact;
  const employer = detail ? employerLine(detail) : null;
  const points = detail?.contactPoints ?? [];
  const lastInteraction = detail?.interactions[0] ?? null;

  const body: PeekBlock[] = [];
  if (party) {
    body.push({
      section: kindWord,
      text:
        employer ??
        party.job_title?.trim() ??
        party.headline?.trim() ??
        party.primary_domain?.trim() ??
        "No title or employer recorded here",
    });
    if (points.length > 0) {
      const rows: PeekRow[] = points.map((point) => {
        const value = point.medium.display_value ?? point.medium.value_raw;
        const blocks = describeBlocks(mediumBlocks(point.medium));
        return {
          text: value,
          ...(point.channel ? { detail: point.channel } : {}),
          ...(blocks ? { status: { text: blocks, tone: "warning" as const } } : {}),
        };
      });
      body.push({ section: "Contact", rows });
    } else {
      body.push({ section: "Contact", text: "No email, phone or handle is recorded here yet." });
    }
    if (party.do_not_contact) {
      body.push({
        section: "Do not contact",
        tone: "warning",
        text: party.do_not_contact_reason?.trim() || "Marked do-not-contact here — no outreach may be sent.",
      });
    }
    body.push({
      section: "Last activity",
      text: lastInteraction
        ? `${channelWords(lastInteraction.channel_code)} · ${formatAbsoluteDate(
            lastInteraction.occurred_at ?? lastInteraction.created_at,
          )}`
        : "Nothing logged with this record yet.",
    });
    body.push({ part: "custom-fields", token: "party", id });
  } else if (!loading) {
    // Denied / deleted / missing / transient each render their TRUE state.
    body.push({ part: "access", token: "party", id, error });
  }

  const title = party?.display_name || kindWord;
  return (
    <PeekWindow open={open} onClose={onClose} label={title}>
      <Peek size="lg" record={{ kind: kindWord, id, title, glyph: KindIcon, body, ...doors }} loading={loading} />
    </PeekWindow>
  );
}
