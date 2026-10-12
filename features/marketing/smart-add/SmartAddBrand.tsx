"use client";

/**
 * Smart Add Brand — two fields, live identification, evidence the person
 * confirms one by one, then Create brand. Arman's words + spec:
 * common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/.
 *
 *   type website and/or social → (debounced) round 1 of the identify workflow
 *   → findings stream into the reserved results area → "This is us" / "Not us"
 *   → confirmed websites/accounts seed the next round (a new run) → Create brand
 *   → heavier work (post history) runs after creation with a live indicator.
 *
 * Every round is a run of the `smart_add_brand_identify` SYSTEM WORKFLOW
 * (aidream), so each step has its own status, cost and retry. No AI here; the
 * declared AI slot (`brand.identify.ai_check`) will stream through the AI
 * Watch window when it is built.
 */

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, ExternalLink, Globe, Loader2, X } from "lucide-react";
import { Button, Field, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useAppDispatch } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { extractErrorMessage } from "@/utils/errors";
import { formatCount } from "@ai-matrx/kit/format";
import { startSystemRun } from "@/features/education/kits/systemRuns";
import { createBrand, createProperty, createSite } from "@/features/marketing/data/service";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import { resolveAccountInput, needsPlatformPick, accountKey } from "@/features/marketing/social/account-input";
import { profileAvatarDoor, socialErrorMessage, trackAccount } from "@/features/marketing/social/server";
import { rememberedMaxPostsPlain } from "@/features/marketing/social/post-count";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  type SocialPlatform,
} from "@/features/marketing/social/types";
import type { MarketingBrand } from "@/features/marketing/types";
import {
  FIELD_LABEL,
  confirmedBasics,
  isSettledByAnother,
  mergeEvidence,
  nextRoundSeeds,
  orderedEvidence,
  seedKeys,
  websiteHost,
  type Decision,
  type EvidenceItem,
  type RoundSeeds,
  type SocialSeed,
} from "./evidence";
import { SmartAddRound, type RoundView } from "./SmartAddRound";

const WORKFLOW_KEY = "smart_add_brand_identify";
/** Typing settles this long before a round starts; a newer value supersedes. */
const IDENTIFY_DEBOUNCE_MS = 700;
/** Confirmations within this window go out as one round. */
const CONFIRM_BATCH_MS = 600;

const PICK_OPTIONS: SelectOption<SocialPlatform | "">[] = [
  { value: "", label: "Platform" },
  ...SOCIAL_PLATFORMS.map((p) => ({ value: p, label: SOCIAL_PLATFORM_LABELS[p] })),
];

interface Round {
  id: string;
  runId: string | null;
  seeds: RoundSeeds;
  error: string | null;
}

interface BackgroundJob {
  key: string;
  label: string;
  state: "running" | "done" | "failed";
  lines: string[];
}

function accountSeedKey(seed: SocialSeed): string | null {
  const parsed = resolveAccountInput({ text: seed.handle_or_url, picked: (seed.platform as SocialPlatform) ?? null });
  return parsed.status === "ok" ? `social:${accountKey(parsed)}` : null;
}

export function SmartAddBrand({ onCreated }: { onCreated?: (brand: MarketingBrand) => void }) {
  const dispatch = useAppDispatch();
  const { format } = useCostDisplay();

  const [websiteText, setWebsiteText] = useState("");
  const [socialText, setSocialText] = useState("");
  const [picked, setPicked] = useState<SocialPlatform | null>(null);
  const parsed = resolveAccountInput({ text: socialText, picked });

  const [rounds, setRounds] = useState<Round[]>([]);
  const [views, setViews] = useState<Record<string, RoundView>>({});
  const [items, setItems] = useState<Map<string, EvidenceItem>>(new Map());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const explored = useRef<Set<string>>(new Set());
  const typedKeys = useRef<{ website: string | null; social: string | null }>({ website: null, social: null });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<MarketingBrand | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [watching, setWatching] = useState(false);

  // ── rounds ──────────────────────────────────────────────────────────────

  const startRound = async (seeds: RoundSeeds) => {
    if (!seeds.website && seeds.socials.length === 0) return;
    for (const k of seedKeys(seeds, accountSeedKey)) explored.current.add(k);
    const id = crypto.randomUUID();
    setRounds((r) => [...r, { id, runId: null, seeds, error: null }]);
    const exclude = Object.entries(decisions)
      .filter(([key, d]) => d === "no" || !key.startsWith("social:"))
      .map(([key]) => key);
    try {
      const organizationId = await ensureOrgId(null);
      const { runId } = await startSystemRun(
        dispatch,
        WORKFLOW_KEY,
        {
          subject: `smart_add:${id}`,
          organizationId,
          sourceFeature: "marketing",
          inputs: { website: seeds.website, socials: seeds.socials, exclude_keys: exclude },
        },
        "Identification could not start.",
      );
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, runId } : x)));
    } catch (error) {
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, error: extractErrorMessage(error) } : x)));
    }
  };

  const resetAll = () => {
    setRounds([]);
    setViews({});
    setItems(new Map());
    setDecisions({});
    explored.current = new Set();
    typedKeys.current = { website: null, social: null };
  };

  // Typed fields → a round, debounced. Changing a field that already ran
  // supersedes everything (a different brand); filling the other field adds a round.
  const typedWebsite = websiteText.trim() && /\.[a-z]{2,}/i.test(websiteText) ? websiteText.trim() : "";
  const typedSocial: SocialSeed | null =
    parsed.status === "ok" ? { handle_or_url: parsed.url, platform: parsed.platform } : null;
  const typedSocialKey = parsed.status === "ok" ? `social:${accountKey(parsed)}` : null;
  const typedWebsiteKey = typedWebsite ? `website:${websiteHost(typedWebsite)}` : null;

  const runTyped = useEffectEvent(() => {
    const prev = typedKeys.current;
    const changed =
      (prev.website && typedWebsiteKey && prev.website !== typedWebsiteKey) ||
      (prev.social && typedSocialKey && prev.social !== typedSocialKey);
    if (changed) resetAll();
    const base = changed ? new Set<string>() : explored.current;
    const seeds: RoundSeeds = {
      website: typedWebsiteKey && !base.has(typedWebsiteKey) ? typedWebsite : "",
      socials: typedSocial && typedSocialKey && !base.has(typedSocialKey) ? [typedSocial] : [],
    };
    typedKeys.current = { website: typedWebsiteKey ?? prev.website, social: typedSocialKey ?? prev.social };
    void startRound(seeds);
  });

  useEffect(() => {
    if (created) return;
    if (!typedWebsiteKey && !typedSocialKey) return;
    const timer = setTimeout(runTyped, IDENTIFY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typedWebsiteKey, typedSocialKey, created]);

  // What the person typed is their own word: its findings are confirmed on arrival.
  const onEvidence = (incoming: EvidenceItem[]) => {
    setItems((prev) => mergeEvidence(prev, incoming));
    const own = incoming.filter(
      (i) =>
        (i.field === "website" && i.source.kind === "website" && typedKeys.current.website === `website:${websiteHost(i.value)}`) ||
        (i.field === "social" && i.key === typedKeys.current.social),
    );
    if (own.length)
      setDecisions((d) => {
        const missing = own.filter((i) => !d[i.key]);
        return missing.length ? { ...d, ...Object.fromEntries(missing.map((i) => [i.key, "yes" as const])) } : d;
      });
  };

  const onView = (view: RoundView) =>
    setViews((v) => (JSON.stringify(v[view.runId]) === JSON.stringify(view) ? v : { ...v, [view.runId]: view }));

  // Confirmed websites/accounts not explored yet → the next round.
  const pending = nextRoundSeeds(items, decisions, explored.current);
  const pendingKey = JSON.stringify(pending);
  const runPending = useEffectEvent(() => void startRound(pending));
  useEffect(() => {
    if (created || pendingKey === JSON.stringify({ website: "", socials: [] })) return;
    const timer = setTimeout(runPending, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [pendingKey, created]);

  const decide = (key: string, decision: Decision) =>
    setDecisions((d) => {
      if (d[key] === decision) {
        const { [key]: _drop, ...rest } = d;
        return rest;
      }
      return { ...d, [key]: decision };
    });

  // ── derived ─────────────────────────────────────────────────────────────

  const roundViews = rounds.map((r) => (r.runId ? views[r.runId] : undefined));
  const working =
    rounds.some((r) => !r.runId && !r.error) ||
    roundViews.some((v) => !!v && !["completed", "failed", "errored", "cancelled", "stopped", "refused"].includes(v.status ?? ""));
  const progressLines = roundViews
    .flatMap((v) => v?.steps ?? [])
    .filter((s) => s.phase === "running" && s.progress)
    .map((s) => s.progress as string);
  const notes = [
    ...rounds.filter((r) => r.error).map((r) => r.error as string),
    ...roundViews.flatMap((v) => v?.steps.flatMap((s) => s.notes) ?? []),
  ];
  const costUsd = roundViews.reduce((sum, v) => sum + (v?.steps.reduce((s, x) => s + x.costUsd, 0) ?? 0), 0);
  const visible = orderedEvidence(items.values());
  const basics = confirmedBasics(items, decisions);
  const canCreate = Boolean(basics.name) && !creating && !created;

  // ── create ──────────────────────────────────────────────────────────────

  const create = async () => {
    if (!basics.name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const organizationId = await ensureOrgId(null);
      const brand = await createBrand({
        organizationId,
        name: basics.name,
        kind: "company",
        industry: basics.category,
        description: basics.description,
        websiteUrl: basics.websiteUrl,
        logoUrl: basics.logoUrl,
        faviconUrl: null,
        ogImageUrl: null,
        notes: null,
        status: "active",
      });
      const properties: { item: EvidenceItem; propertyId: string | null }[] = [];
      for (const item of basics.accounts) {
        try {
          const row = await createProperty({
            organizationId,
            brandId: brand.id,
            kind: (item.platform ?? "website") as Parameters<typeof createProperty>[0]["kind"],
            url: item.url,
            handle: item.handle,
            displayName: item.label,
            status: "active",
          });
          properties.push({ item, propertyId: row.id });
        } catch {
          properties.push({ item, propertyId: null });
        }
      }
      if (basics.websiteUrl) {
        try {
          const parsedUrl = normalizeWebsiteUrl(basics.websiteUrl);
          await createSite({
            organizationId,
            name: parsedUrl.hostname,
            rootUrl: parsedUrl.toString(),
            domain: parsedUrl.hostname.toLowerCase(),
            brandId: brand.id,
          });
        } catch (error) {
          setJobs((j) => [...j, { key: "site", label: "Website", state: "failed", lines: [extractErrorMessage(error)] }]);
        }
      }
      setCreated(brand);
      onCreated?.(brand);
      startBackground(brand, organizationId, properties);
    } catch (error) {
      setCreateError(extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  /** Post history for every confirmed account, after the brand exists — never blocks. */
  const startBackground = (
    brand: MarketingBrand,
    organizationId: string,
    properties: { item: EvidenceItem; propertyId: string | null }[],
  ) => {
    for (const { item, propertyId } of properties) {
      if (!item.platform || !propertyId) continue;
      const key = item.key;
      const label = `${platformLabel(item.platform)} @${item.handle ?? ""}`;
      setJobs((j) => [...j, { key, label, state: "running", lines: ["Fetching post history"] }]);
      const say = (line: string) =>
        setJobs((j) => j.map((x) => (x.key === key && x.lines[x.lines.length - 1] !== line ? { ...x, lines: [...x.lines, line] } : x)));
      void (async () => {
        try {
          await trackAccount(
            {
              handleOrUrl: item.url ?? item.value,
              platform: item.platform as SocialPlatform,
              role: "own",
              brandId: brand.id,
              propertyId,
              maxPosts: await rememberedMaxPostsPlain(),
            },
            { organizationId, onProgress: (p) => say(p.message) },
          );
          setJobs((j) => j.map((x) => (x.key === key ? { ...x, state: "done", lines: [...x.lines, "Done"] } : x)));
        } catch (error) {
          const message = socialErrorMessage(error, "Post history could not be fetched");
          setJobs((j) => j.map((x) => (x.key === key ? { ...x, state: "failed", lines: [...x.lines, message] } : x)));
        }
      })();
    }
  };

  // ── render ──────────────────────────────────────────────────────────────

  const showPicker = needsPlatformPick(parsed, null);
  const backgroundRunning = jobs.some((j) => j.state === "running");

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3" data-testid="smart-add-brand">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Website</span>
          <Field
            aria-label="Website"
            // ui-exception: a web address is a raw value, not prose
            placeholder="example.com"
            value={websiteText}
            disabled={Boolean(created)}
            onChange={(e) => setWebsiteText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Social link</span>
          <div className="flex gap-2">
            <Field
              aria-label="Handle or link"
              // ui-exception: a handle or address is a raw value, not prose
              placeholder="@handle or profile link"
              value={socialText}
              disabled={Boolean(created)}
              onChange={(e) => setSocialText(e.target.value)}
              className="min-w-0 flex-1"
            />
            {showPicker ? (
              <Select
                aria-label="Platform"
                value={picked ?? ""}
                options={PICK_OPTIONS}
                onValueChange={(value) => setPicked(value === "" ? null : value)}
                className="w-32 shrink-0"
              />
            ) : null}
          </div>
        </label>
      </div>

      {/* Working line: one fixed-height row, never shifts. */}
      <div className="flex h-6 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        {working ? (
          <>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="truncate">{progressLines[0] ?? "Identifying"}</span>
          </>
        ) : rounds.length ? (
          <span className="truncate">{items.size ? `${items.size} findings` : "Nothing found yet"}</span>
        ) : (
          <span className="truncate">Enter a website or a social link</span>
        )}
        <span className="ml-auto shrink-0 tabular-nums">
          {rounds.length ? (costUsd > 0 ? format(costUsd) : "Free so far") : null}
        </span>
      </div>

      {/* Results: reserved from the start (zero layout shift); findings stream in. */}
      <div
        className="h-[26rem] overflow-y-auto rounded-lg border border-border bg-card"
        data-testid="smart-add-results"
      >
        {visible.length === 0 ? (
          <ResultsSkeleton active={working} />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((item) => (
              <EvidenceRow
                key={item.key}
                item={item}
                decision={decisions[item.key] ?? null}
                settled={isSettledByAnother(item, items, decisions)}
                locked={Boolean(created)}
                onDecide={(d) => decide(item.key, d)}
              />
            ))}
          </ul>
        )}
      </div>

      {notes.length ? (
        <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {notes.slice(0, 3).map((n) => (
            <li key={n} className="truncate" title={n}>
              {n}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Create: the confirmed basics, one row. */}
      <div className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {basics.logoUrl ? (
            <img src={basics.logoUrl} alt="" className="size-6 shrink-0 rounded object-contain" />
          ) : null}
          <span className="truncate font-medium">{basics.name ?? "Confirm a name to create the brand"}</span>
          {basics.name ? (
            <span className="truncate text-xs text-muted-foreground">
              {[basics.websiteUrl ? websiteHost(basics.websiteUrl) : null, basics.accounts.length ? `${basics.accounts.length} accounts` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </div>
        {created ? (
          <a
            href={marketingRoutes.brand(marketingSeg(created))}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Open brand <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <Button variant="primary" disabled={!canCreate} onClick={() => void create()}>
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Create brand
          </Button>
        )}
      </div>
      {createError ? <p className="text-xs text-destructive">{createError}</p> : null}

      {created && jobs.length ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs" data-testid="smart-add-background">
          <div className="flex items-center gap-2">
            {backgroundRunning ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Check className="size-3.5 text-primary" />}
            <span className="font-medium">{backgroundRunning ? "Still working in the background" : "Background work finished"}</span>
            <Button variant="quiet" className="ml-auto" onClick={() => setWatching((w) => !w)}>
              {watching ? "Hide" : "Watch"}
            </Button>
          </div>
          {watching
            ? jobs.map((j) => (
                <div key={j.key} className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-40 shrink-0 truncate">{j.label}</span>
                  <span className="truncate">{j.lines[j.lines.length - 1]}</span>
                </div>
              ))
            : null}
        </div>
      ) : null}

      {rounds.map((r) =>
        r.runId ? <SmartAddRound key={r.runId} runId={r.runId} onEvidence={onEvidence} onView={onView} /> : null,
      )}
    </div>
  );
}

function ResultsSkeleton({ active }: { active: boolean }) {
  return (
    <ul className="divide-y divide-border" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex h-14 items-center gap-3 px-3">
          <div className={`size-8 rounded-md bg-muted ${active ? "animate-pulse" : ""}`} />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className={`h-3 w-1/3 rounded bg-muted ${active ? "animate-pulse" : ""}`} />
            <div className={`h-2.5 w-1/2 rounded bg-muted/70 ${active ? "animate-pulse" : ""}`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EvidenceRow({
  item,
  decision,
  settled,
  locked,
  onDecide,
}: {
  item: EvidenceItem;
  decision: Decision | null;
  settled: boolean;
  locked: boolean;
  onDecide: (d: Decision) => void;
}) {
  const dim = decision === "no" || (settled && !decision);
  const meta = [
    FIELD_LABEL[item.field],
    item.followers != null ? `${formatCount(item.followers)} followers` : null,
    item.source.where ?? item.source.kind,
    `${Math.round(item.confidence * 100)}%`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className={`flex h-14 items-center gap-3 px-3 transition-opacity ${dim ? "opacity-45" : ""}`}
      data-testid="smart-add-item"
      data-field={item.field}
      data-decision={decision ?? "open"}
    >
      <ItemVisual item={item} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm" title={item.value}>
          {item.field === "social"
            ? `@${item.handle ?? ""}${item.label ? ` · ${item.label}` : ""}`
            : item.field === "logo"
              ? "Logo"
              : item.field === "website"
                ? (item.label ?? websiteHost(item.value))
                : item.value}
        </span>
        <span className="truncate text-xs text-muted-foreground" title={item.source.url ?? undefined}>
          {meta}
        </span>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant={decision === "yes" ? "primary" : "outline"}
          aria-pressed={decision === "yes"}
          disabled={locked}
          onClick={() => onDecide("yes")}
        >
          <Check className="size-3.5" /> This is us
        </Button>
        <Button
          variant={decision === "no" ? "danger" : "quiet"}
          aria-pressed={decision === "no"}
          disabled={locked}
          onClick={() => onDecide("no")}
        >
          <X className="size-3.5" /> Not us
        </Button>
      </div>
    </li>
  );
}

function ItemVisual({ item }: { item: EvidenceItem }) {
  if (item.field === "social" && item.profile_id) {
    return (
      <SocialImage
        door={profileAvatarDoor(item.profile_id)}
        url={item.image_url}
        fallback={<PlatformMark platform={item.platform ?? ""} size={20} />}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  if (item.field === "social") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center">
        <PlatformMark platform={item.platform ?? ""} size={20} />
      </span>
    );
  }
  if (item.field === "logo" && (item.image_url || item.value)) {
    return item.profile_id ? (
      <SocialImage
        door={profileAvatarDoor(item.profile_id)}
        url={item.image_url}
        fallback={<Globe className="size-4" />}
        className="size-8 shrink-0 rounded-md object-contain"
      />
    ) : (
      <img src={item.image_url ?? item.value} alt="" className="size-8 shrink-0 rounded-md bg-muted object-contain" />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium uppercase text-muted-foreground">
      {FIELD_LABEL[item.field].slice(0, 2)}
    </span>
  );
}
