"use client";

// features/crm/components/record/CompanyIntelligenceCard.tsx
//
// "Company intelligence" on a company record: what live data says about the
// company (employees, followers, funding, rating, reviews, address, hours),
// one row per source. NOTHING fetches without a click, and every Get / Refresh
// names its price in points first. A source whose web address the record does
// not have yet offers a paste box; the address is saved as a contact method
// (the record's canonical home for links), never into a private field.
//
// Persistence: the display-ready facts live on `crm.party.attributes
// .company_intelligence[source]` (see company-intelligence.ts) and the full
// record is in the person's own fetched table named in the same block.

import { useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { useSourceLookup } from "@/features/data-sources/useSourceLookup";
import { FetchProgress } from "@/features/data-sources/FetchProgress";
import { addContactPoint, updateParty } from "../../service";
import type { ContactPoint } from "../../types";
import {
  INTEL_SOURCES,
  candidateUrls,
  inputUrlFor,
  intelFacts,
  normalizePastedUrl,
  storedIntel,
  withIntel,
  type IntelSource,
} from "../../company-intelligence";
import { SectionCard } from "./SectionCard";

interface CardParty {
  id: string;
  organization_id: string;
  display_name: string | null;
  primary_domain: string | null;
  attributes?: unknown;
}

export function CompanyIntelligenceCard({
  party,
  contactPoints,
  onChanged,
}: {
  party: CardParty;
  contactPoints: ContactPoint[];
  onChanged: () => void;
}) {
  const urls = candidateUrls({
    values: contactPoints.flatMap((p) => [p.medium.value_raw, p.medium.profile_url, p.medium.display_value]),
  });
  const stored = storedIntel(party.attributes);
  return (
    <SectionCard title="Company intelligence" Icon={Building2}>
      <ul className="divide-y divide-border" data-testid="company-intelligence">
        {INTEL_SOURCES.map((source) => (
          <IntelRow
            key={source.key}
            source={source}
            party={party}
            inputUrl={inputUrlFor(source, urls)}
            stored={stored[source.key] ?? null}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </SectionCard>
  );
}

function IntelRow({
  source,
  party,
  inputUrl,
  stored,
  onChanged,
}: {
  source: (typeof INTEL_SOURCES)[number];
  party: CardParty;
  inputUrl: string | null;
  stored: ReturnType<typeof storedIntel>[string] | null;
  onChanged: () => void;
}) {
  const lookup = useSourceLookup({
    organizationId: party.organization_id,
    sourceKey: source.key,
    runKey: `crm-intel:${party.id}:${source.key}`,
    tableName: "Company intelligence",
  });
  const [pasted, setPasted] = useState("");
  const [saving, setSaving] = useState(false);
  const running = lookup.run.status === "running";
  const url = inputUrl ?? (stored?.source_url || null);

  const get = () => {
    if (!url) return;
    lookup.start(url, async (record, result) => {
      const facts = intelFacts(source.key, record);
      if (facts.length === 0) {
        toast.error(`${source.label}: the page came back with nothing we could read.`);
        return;
      }
      try {
        await updateParty(party.id, {
          attributes: withIntel(party.attributes, source.key, {
            fetched_at: new Date().toISOString(),
            source_url: url,
            job_id: result.job_id,
            table_id: result.table_id,
            facts,
          }),
        });
        onChanged();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save what was found.");
      }
    });
  };

  const savePasted = async () => {
    const normal = normalizePastedUrl(source, pasted);
    if (!normal) {
      toast.error(`That is not a ${source.label.toLowerCase()} address. Example: ${source.example}`);
      return;
    }
    setSaving(true);
    try {
      await addContactPoint({ partyId: party.id, orgId: party.organization_id, channel: "url", value: normal, label: source.label });
      setPasted("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the address.");
    } finally {
      setSaving(false);
    }
  };

  const price = lookup.quote ?? "…";
  return (
    <li className="px-2.5 py-1.5" data-intel-source={source.key}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{source.label}</span>
        {url ? (
          <Button
            type="button"
            variant="outline"
            className="h-6 gap-1 px-2 text-[11px]"
            disabled={running || !lookup.source}
            onClick={get}
            title={price}
          >
            {stored ? <RefreshCw className="h-3 w-3" /> : null}
            {running ? "Getting…" : `${stored ? "Refresh" : "Get"} · ${price}`}
          </Button>
        ) : null}
      </div>
      {lookup.run.status === "running" ? (
        <div className="mt-1">
          <FetchProgress label={source.label} progress={lookup.run.progress} startedAt={lookup.run.startedAt} />
        </div>
      ) : null}
      {lookup.run.status === "failed" ? (
        <p className="mt-1 text-[11px] text-destructive" role="alert">
          {lookup.run.refusal.userMessage}{" "}
          <button type="button" className="underline" onClick={lookup.dismiss}>
            Dismiss
          </button>
        </p>
      ) : null}
      {!url ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Input
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={`Paste ${source.example.replace(/^https?:\/\//, "").slice(0, 34)}…`}
            className="h-6 flex-1 text-[11px]"
            aria-label={`${source.label} address`}
          />
          <Button type="button" variant="outline" className="h-6 px-2 text-[11px]" disabled={saving || !pasted.trim()} onClick={() => void savePasted()}>
            Save address
          </Button>
        </div>
      ) : null}
      {stored && stored.facts.length > 0 ? (
        <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {stored.facts.map((f) => (
            <div key={f.label} className="flex gap-1">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="text-foreground">{f.value}</dd>
            </div>
          ))}
          {stored.fetched_at ? (
            <div className="text-muted-foreground">{formatRelativeTime(stored.fetched_at, { style: "intl" })}</div>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}
