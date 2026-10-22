"use client";

/**
 * Research readiness on the brand page (brand-discovery PLAN § Research starts on conditions).
 * Reads aidream GET /brand-research/{id}/readiness: per area the four conditions, what is missing, the one action.
 * On load it never searches (probe=false); "Check the name" runs the cheap name search. Actions reuse existing
 * doors: Smart Add enrich (confirm the website) and Smart Add validate ("which of these are yours").
 * Start runs POST /brand-research/{id}/start (custom=true on the custom path: confirmed site and accounts only).
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, PropertyRow, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { callApi } from "@/lib/api/call-api";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { smartAddEnrichHref, smartAddValidateHref } from "@/features/marketing/smart-add/smartAddUrl";

interface ReadinessCondition {
  key: "ours_known" | "name_clear" | "outside_exists" | "own_site_real";
  label: string;
  met: boolean | null;
  detail: string;
  missing: string | null;
  action: { key: string; label: string } | null;
}

interface ReadinessArea {
  key: "outside_world" | "own_site";
  ready: boolean;
  path: "normal" | "custom" | "skip" | null;
  conditions: string[];
}

interface Readiness {
  brand_id: string;
  conditions: ReadinessCondition[];
  areas: ReadinessArea[];
}

const AREA_LABEL: Record<ReadinessArea["key"], string> = {
  outside_world: "What others say",
  own_site: "Their own site",
};

const PATH_LABEL: Record<NonNullable<ReadinessArea["path"]>, string> = {
  normal: "Ready",
  custom: "Confirmed sources only",
  skip: "Too new for outside research",
};

function isReadiness(value: unknown): value is Readiness {
  return typeof value === "object" && value !== null && Array.isArray((value as Readiness).conditions);
}

export function BrandResearchReadiness({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "start" | null>(null);

  const load = async (probe: boolean) => {
    const result = await dispatch(
      callApi({
        // New door 2026-10-22 (aidream api/routers/brand_research.py); not in the published api-types yet.
        path: "/brand-research/{brand_id}/readiness" as never,
        method: "GET",
        pathParams: { brand_id: brandId } as never,
        queryParams: { probe },
        scopeOverrides: { organization_id: organizationId },
      }),
    );
    if (result.error) setError(result.error.message || "Readiness could not be read.");
    else if (isReadiness(result.data)) {
      setError(null);
      setReadiness(result.data);
    } else setError("Readiness came back in a shape this page cannot read.");
  };

  // Re-checked on every visit and whenever the brand changes (nothing is cached server-side either).
  useEffect(() => {
    void load(false);
  }, [brandId]);

  // Each server action key opens its own existing door; a key with no door here shows no button (never a guess).
  const ACTION_HREF: Record<string, (id: string) => string> = {
    confirm_identity: smartAddEnrichHref,
    review_results: smartAddValidateHref,
    owner_questions: marketingRoutes.brandOwnerStory,
    crawl_site: marketingRoutes.brandWebsites,
  };
  const open = (key: string) => {
    const to = ACTION_HREF[key];
    if (to) startTransition(() => router.push(to(brandId)));
  };

  const start = async (custom: boolean) => {
    setBusy("start");
    const result = await dispatch(
      callApi({
        path: "/brand-research/{brand_id}/start" as never,
        method: "POST",
        pathParams: { brand_id: brandId } as never,
        body: { custom } as never,
        scopeOverrides: { organization_id: organizationId },
      }),
    );
    setBusy(null);
    if (result.error) toast.error(result.error.message || "Research did not start.");
    else toast.success("Research started");
  };

  const check = async () => {
    setBusy("check");
    await load(true);
    setBusy(null);
  };

  const byKey = new Map((readiness?.conditions ?? []).map((c) => [c.key, c]));
  return (
    <SectionCard
      title="Research readiness"
      anchor="research-readiness"
      about="Research starts only when it can be good. Each missing condition shows the one step that fixes it."
      headerExtra={
        <Button variant="quiet" onClick={check} disabled={busy !== null}>
          {busy === "check" ? "Checking" : "Check the name"}
        </Button>
      }
    >
      {error ? (
        <div className="flex items-center gap-2">
          <p className="type-body text-muted-foreground">{error}</p>
          <ErrorAlchemyMenu error={error} />
          <Button variant="outline" onClick={() => void load(false)}>
            Try again
          </Button>
        </div>
      ) : null}
      {!readiness && !error ? <RegionSkeleton shape="rows" count={4} aria-label="Reading research readiness" /> : null}
      {(readiness?.areas ?? []).map((area) => (
        <div key={area.key} className="grid gap-2 py-2">
          <div className="flex items-center gap-2">
            <span className="type-label">{AREA_LABEL[area.key]}</span>
            <Badge tone={area.ready ? "success" : "neutral"}>
              {area.path ? PATH_LABEL[area.path] : area.ready ? "Ready" : "Not yet"}
            </Badge>
          </div>
          {area.conditions.map((key) => {
            const c = byKey.get(key as ReadinessCondition["key"]);
            if (!c) return null;
            return (
              <div key={key} className="flex items-center gap-3">
                <Badge tone={c.met ? "success" : c.met === false ? "warning" : "neutral"}>
                  {c.met ? "Met" : c.met === false ? "Missing" : "Not measured"}
                </Badge>
                <PropertyRow label={c.label} value={c.met ? c.detail : (c.missing ?? c.detail)} />
                {!c.met && c.action && ACTION_HREF[c.action.key] ? (
                  <Button variant="outline" onClick={() => open(c.action?.key ?? "")}>
                    {c.action.label}
                  </Button>
                ) : null}
              </div>
            );
          })}
          {area.key === "outside_world" && area.path === "normal" ? (
            <Button variant="primary" onClick={() => start(false)} disabled={busy !== null}>
              Research this brand
            </Button>
          ) : null}
          {area.key === "outside_world" && area.path === "custom" && byKey.get("ours_known")?.met ? (
            <Button variant="outline" onClick={() => start(true)} disabled={busy !== null}>
              Research confirmed sources only
            </Button>
          ) : null}
        </div>
      ))}
    </SectionCard>
  );
}
