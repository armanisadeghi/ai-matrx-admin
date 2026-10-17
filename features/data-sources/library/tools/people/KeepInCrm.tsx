"use client";

/**
 * "Save to CRM" for a people or company answer (lane L12b), through the CRM's own find-or-create door
 * (`resolveParty`), so a company or person already in the CRM is matched, never doubled. The one rule it
 * carries: a found email is a guess until an email check confirms it, and a guess is never attached as
 * a way to reach someone. The note after the save says which happened, in words.
 */

import { useState } from "react";
import { ContactRound } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";

import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { addContactPoint, ensurePrimaryContactPoints, resolveParty } from "@/features/crm/service";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

import { emailVerdictWords, foundEmailWords, kindOf, partyToKeep } from "./lookupPlan";

/** Where a person stands on one address: what a finder said, then what a check said. */
export function AddressStatus({ output, verdict }: { output: unknown; verdict: unknown }) {
  if (kindOf(output) !== "work_email") return null;
  const checked = emailVerdictWords(verdict);
  const text = checked?.text ?? foundEmailWords(output);
  if (!text) return null;
  const address = String((output as Record<string, unknown>).email ?? "");
  const tone = checked ? (checked.tone === "good" ? "success" : checked.tone === "warn" ? "warning" : "destructive") : "neutral";
  return (
    <div className="flex items-center gap-2" data-address-status={checked?.tone ?? "found"}>
      {address ? <span className="text-sm font-medium text-foreground">{address}</span> : null}
      <Badge tone={tone}>{text}</Badge>
    </div>
  );
}

export function KeepInCrm({ output, inputs, confirmedEmail }: { output: unknown; inputs: Record<string, unknown>; confirmedEmail: string | null }) {
  const org = useOrganizationRequired();
  const keep = partyToKeep(output, { confirmedEmail, inputs });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ partyId: string; name: string; note: string; created: boolean; emails: string[] } | null>(null);

  if (!keep) return null;
  const orgId = org.organizationId;

  async function save() {
    if (!keep || !orgId) return;
    setBusy(true);
    try {
      const resolved = await resolveParty({
        kind: keep.kind,
        displayName: keep.displayName,
        orgId,
        source: "tool_lookup",
        sourceDetail: kindOf(output) ?? "tool",
        firstName: keep.firstName,
        lastName: keep.lastName,
        jobTitle: keep.jobTitle,
        primaryDomain: keep.primaryDomain,
        emails: keep.emails,
        phones: keep.phones,
        attributes: keep.attributes,
      });
      if (keep.emails.length > 0 || keep.phones.length > 0) {
        await ensurePrimaryContactPoints({ partyId: resolved.partyId, emails: keep.emails, phones: keep.phones });
      }
      setSaved({ partyId: resolved.partyId, name: resolved.displayName, note: keep.note, created: resolved.created, emails: keep.emails });
    } catch (cause) {
      toast.error(extractErrorMessage(cause, "That didn't save."));
    } finally {
      setBusy(false);
    }
  }

  // The address was confirmed after the person was saved: attach it to that same person, never a second one.
  async function attachConfirmed() {
    const email = keep?.emails[0];
    if (!saved || !email || !orgId) return;
    setBusy(true);
    try {
      await addContactPoint({ partyId: saved.partyId, orgId, channel: "email", value: email, makePrimary: true });
      setSaved({ ...saved, emails: [email], note: "Added the confirmed email to the person." });
    } catch (cause) {
      toast.error(extractErrorMessage(cause, "That didn't save."));
    } finally {
      setBusy(false);
    }
  }
  const canAttach = saved !== null && keep.emails.length > 0 && saved.emails.length === 0;

  return (
    <div data-keep-in-crm="" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <ContactRound className="h-4 w-4 text-muted-foreground" aria-hidden />
      {saved ? (
        <>
          <span className="text-sm text-foreground">
            {saved.created ? "Added" : "Already in your CRM"}: <EntityRef token="party" id={saved.partyId} name={saved.name} openInNewTab />
          </span>
          {canAttach ? (
            <Button variant="outline" onClick={() => void attachConfirmed()} disabled={busy} data-keep-attach-email="">
              Add the confirmed email
            </Button>
          ) : null}
          <span className="basis-full text-xs text-muted-foreground" data-keep-note="">
            {saved.note}
          </span>
        </>
      ) : (
        <>
          <span className="text-sm text-foreground">{keep.displayName}</span>
          <Button onClick={() => void save()} disabled={busy || !orgId} data-keep-in-crm-save="">
            {busy ? "Saving…" : "Save to CRM"}
          </Button>
          {keep.unconfirmedEmail ? <span className="text-xs text-muted-foreground">The email stays off the record until it is checked.</span> : null}
        </>
      )}
    </div>
  );
}
