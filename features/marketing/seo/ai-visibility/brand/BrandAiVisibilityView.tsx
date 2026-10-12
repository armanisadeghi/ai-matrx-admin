"use client";

/** The full brand-level view: latest score and leaderboard, who is asked about, competitors, history. */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Cost } from "@/components/cost/Cost";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { useBrand } from "@/features/marketing/data/hooks";
import { useAccess } from "@/utils/permissions/access";
import { canEditAccess } from "@/utils/permissions/access-core";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { useQueryClient } from "@tanstack/react-query";

import { brandChecksKey, saveBrandAiCompetitors } from "./data";
import { useBrandChecks, useBrandCheckEstimate } from "./hooks";
import { RunCheckButton } from "./RunCheckButton";
import { ShareBars } from "./ShareBars";

export function BrandAiVisibilityView({ brandId }: { brandId: string }) {
  const brandQuery = useBrand(brandId);
  const brand = brandQuery.data ?? null;
  const canEdit = canEditAccess(useAccess("web_brand", brandId).level);
  const checks = useBrandChecks(brandId);
  const organizationId = brand?.organization_id ?? "";
  const estimate = useBrandCheckEstimate(brandId, organizationId, canEdit && !!brand);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = checks.data?.[0] ?? null;

  if (!brand) return <div className="h-24 animate-pulse rounded-md bg-muted/50" />;

  const profile = (brand.profile ?? {}) as Record<string, unknown>;
  const configured = (
    ((profile.ai_visibility as { competitors?: unknown } | undefined)?.competitors as unknown[] | undefined) ?? []
  ).filter((v): v is string => typeof v === "string");

  const save = async (next: string[]) => {
    setSaving(true);
    try {
      await saveBrandAiCompetitors({
        brandId,
        expectedVersion: brand.version,
        profile,
        competitors: next,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["marketing"] }),
        queryClient.invalidateQueries({ queryKey: brandChecksKey(brandId) }),
      ]);
      setDraft("");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const add = () => {
    const name = draft.trim();
    if (!name || configured.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    void save([...configured, name]);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="What AI says about you"
        headerExtra={
          canEdit ? <RunCheckButton brandId={brandId} organizationId={organizationId} /> : null
        }
      >
        {latest ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums">
                {latest.score == null ? "—" : `${latest.score}%`}
              </span>
              <span className="text-sm text-muted-foreground">
                share of voice vs {Math.max(0, latest.entries.length - 1)} compared ·{" "}
                {formatDistanceToNow(new Date(latest.checked_at), { addSuffix: true })}
                {latest.cost_usd != null ? (
                  <>
                    {" "}
                    · <Cost usd={latest.cost_usd} />
                  </>
                ) : null}
              </span>
            </div>
            <ShareBars entries={latest.entries} />
            {latest.notices.length > 0 ? (
              <ul className="list-disc pl-5 text-xs text-muted-foreground">
                {latest.notices.slice(0, 3).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not checked yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Asked about">
        <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{latest?.queries.name ?? brand.name}</dd>
          {(latest?.queries.handles ?? []).length > 0 ? (
            <>
              <dt className="text-muted-foreground">Handles</dt>
              <dd>{latest?.queries.handles?.join(", ")}</dd>
            </>
          ) : null}
          {(latest?.queries.expertise ?? []).length > 0 ? (
            <>
              <dt className="text-muted-foreground">Expertise</dt>
              <dd>{latest?.queries.expertise?.join(", ")}</dd>
            </>
          ) : null}
        </dl>
      </SectionCard>

      <SectionCard title="Compared against">
        <div className="flex flex-wrap gap-2">
          {(estimate.data?.competitors ?? configured).map((name) => {
            const own = configured.includes(name);
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-2.5 text-xs"
              >
                {name}
                {own && canEdit ? (
                  <button
                    type="button"
                    className="-mr-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full"
                    aria-label={`Remove ${name}`}
                    disabled={saving}
                    onClick={() => void save(configured.filter((c) => c !== name))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
        {canEdit ? (
          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="Competitor name"
              className="max-w-xs"
              aria-label="Competitor name"
            />
            <Button variant="outline" onClick={add} disabled={saving || !draft.trim()}>
              Add
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {(checks.data?.length ?? 0) > 1 ? (
        <SectionCard title="Earlier checks">
          <ul className="flex flex-col gap-1 text-sm">
            {checks.data?.slice(1).map((row) => (
              <li key={row.id} className="flex justify-between">
                <span>{formatDistanceToNow(new Date(row.checked_at), { addSuffix: true })}</span>
                <span className="tabular-nums">{row.score == null ? "—" : `${row.score}%`}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
