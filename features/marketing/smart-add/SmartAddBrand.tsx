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

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { Check, ExternalLink, Globe, Loader2, RotateCcw, X } from "lucide-react";
import { Button, Field, SegmentedControl, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useAppDispatch } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { extractErrorMessage } from "@/utils/errors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatCount } from "@ai-matrx/kit/format";
import { startSystemRun } from "@/features/education/kits/systemRuns";
import {
  createBrand,
  createBusinessFact,
  createBusinessLocation,
  createProperty,
  createSite,
  moveSiteBrand,
  createDiscoveredCandidates,
  updateBusinessLocation,
} from "@/features/marketing/data/service";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { initializeSite } from "@/features/marketing/crawler/direct-client";
import { roundFailed } from "./roundFailure";
import { SmartAddSlots } from "./SmartAddSlots";
import { SmartAddHero, stageLogo, stageName } from "./SmartAddHero";
import { Shared, riseIn } from "./stage/Shared";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { useAppSelector } from "@/lib/redux/hooks";
import { useSocialSpend } from "@/features/marketing/social/cost";
import { BrandCard, CompareSources, CustomAdd, situationOf } from "./SmartAddExtras";
import { ADOPTION_RELEASE_GRACE_MS } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { detachWorkflowRunState } from "@/features/workflow-runtime/redux/adopt-workflow-run.thunk";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import { resolveAccountInput, needsPlatformPick, accountKey } from "@/features/marketing/social/account-input";
import { profileAvatarDoor } from "@/features/marketing/social/server";
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
  applyDecision,
  candidateCategory,
  confirmedBasics,
  mergeEvidence,
  nextRoundSeeds,
  orderedEvidence,
  seedKeys,
  websiteHost,
  type Decision,
  type EvidenceItem,
  type RoundSeeds,
  type SocialSeed,
  type ConfirmedFacts,
  wakeFacts,
  type Candidate,
  type Relation,
} from "./evidence";
import {
  excludeNotUs,
  routeRelated,
  routeWebChoices,
  relatedCompetitors,
  suggestContext,
  webCandidate,
  webSiteRoot,
  type RelatedCandidate,
} from "./relations";
import { useRelationKinds } from "./SmartAddExtras";
import { suggestKind, type WebChoice } from "./webKinds";
import { SETUP_STEPS, SmartAddRound, type RoundView } from "./SmartAddRound";
import { SmartAddGateLine } from "./SmartAddGateLine";
import { SmartAddBioLinks } from "./SmartAddBioLinks";
import { SmartAddWebRow } from "./SmartAddWebRow";
import { captureProvision } from "@/features/provision-window/data";
import { useOpenProvisionWindow } from "@/features/overlays/openers/provisionWindow";
import { ProvisionCaptures } from "@/features/provision-window/ProvisionCaptures";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { SMART_ADD_SURFACE } from "./builderSurface";

/** The call point where the brand-intake analysis would run (server: brand_intake/provision.py). */
const BRAND_INTAKE_POINT = "brand_intake.smart_add_create";

const WORKFLOW_KEY = "smart_add_brand_identify";
const SETUP_KEY = "smart_add_brand_setup";
/** Typing settles this long before a round starts; a newer value supersedes. */
const IDENTIFY_DEBOUNCE_MS = 700;
/** The stage holds this long after the first real finding — however fast the site answered — so
 *  people see the logo, name, colors and accounts gather before the structured page takes over. */
const STAGE_HOLD_MS = 3_000;
/** Only the person's own answers (no run): just long enough to see them land. */
const STAGE_ANSWER_MS = 900;
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

  // A personal brand: a headshot instead of a logo, and expertise.
  const [person, setPerson] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [views, setViews] = useState<Record<string, RoundView>>({});
  const [items, setItems] = useState<Map<string, EvidenceItem>>(new Map());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  // Compare: candidates that are neither ours nor "not us" — how each relates (keyed by candidate id).
  const [relations, setRelations] = useState<Record<string, RelatedCandidate>>({});
  // "On the web": what each web result is to the brand (web.brand_relation_kind key + sentiment).
  const [webChoices, setWebChoices] = useState<Record<string, WebChoice>>({});
  const explored = useRef<Set<string>>(new Set());
  /** Images the screen could not load: hidden tiles, never saved as inbox candidates. */
  const brokenKeys = useRef<Set<string>>(new Set());
  const typedKeys = useRef<{ website: string | null; social: string | null }>({ website: null, social: null });
  // Confirmed facts already sent to the workflow ("name:<v>", "location:<v>"): a new one wakes its steps.
  const wokenSent = useRef<Set<string>>(new Set());

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<MarketingBrand | null>(null);
  const [setupRunId, setSetupRunId] = useState<string | null>(null);
  const [provisionTick, setProvisionTick] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const openProvision = useOpenProvisionWindow();
  const [setupView, setSetupView] = useState<RoundView | null>(null);
  // A restart parks the run as cancelled and the platform's recovery sweep resumes it; the
  // stream adapter treats cancelled as final, so the screen lets go and re-reads the run.
  const [setupAttached, setSetupAttached] = useState(true);
  const [saveNotes, setSaveNotes] = useState<string[]>([]);
  // Tier 3: the real site crawl, started after Create, never on the identify path.
  const [crawl, setCrawl] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [crawlNote, setCrawlNote] = useState<string | null>(null);
  // Admin Builder panel: everything this screen has (no-op for everyone else).
  const builder = useBuilderFeed(SMART_ADD_SURFACE);

  // ── rounds ──────────────────────────────────────────────────────────────

  const startRound = async (seeds: RoundSeeds, woken: ConfirmedFacts = {}) => {
    if (!seeds.website && seeds.socials.length === 0 && !woken.name && !woken.location) return;
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
          // `confirmed` = every fact the person confirmed; `woken` = the ones new this round, which wake
          // the confirmed-tier steps (news/videos/images, local) — the run skips the rest.
          inputs: { website: seeds.website, socials: seeds.socials, confirmed: confirmedFacts, woken, exclude_keys: exclude },
        },
        "Identification could not start.",
      );
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, runId } : x)));
    } catch (error) {
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, error: plainStartError(error) } : x)));
    }
  };

  const resetAll = () => {
    setRounds([]);
    setViews({});
    setItems(new Map());
    setDecisions({});
    setRelations({});
    setWebChoices({});
    setComparing(false);
    explored.current = new Set();
    wokenSent.current = new Set();
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
        // The typed website is the primary one; a typed account is ours.
        return missing.length
          ? { ...d, ...Object.fromEntries(missing.map((i) => [i.key, i.field === "website" ? ("preferred" as const) : ("yes" as const)])) }
          : d;
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

  // The facts the person confirmed, as the identify workflow reads them.
  const factBasics = confirmedBasics(items, decisions, person);
  const confirmedFacts: ConfirmedFacts = {
    ...(factBasics.name ? { name: factBasics.name } : {}),
    ...(factBasics.websiteUrl ? { domain: websiteHost(factBasics.websiteUrl) } : {}),
    ...(factBasics.facts.find((f) => f.field === "address")?.value
      ? { location: factBasics.facts.find((f) => f.field === "address")?.value }
      : {}),
  };
  // A confirmed name / location wakes the steps waiting on it (a new round carrying only those facts).
  const woken = wakeFacts(confirmedFacts, wokenSent.current);
  const wokenKey = JSON.stringify(woken);
  const runWoken = useEffectEvent(() => {
    const next = wakeFacts(confirmedFacts, wokenSent.current);
    if (next.name) wokenSent.current.add(`name:${next.name}`);
    if (next.location) wokenSent.current.add(`location:${next.location}`);
    void startRound({ website: "", socials: [] }, next);
  });
  useEffect(() => {
    if (created || wokenKey === "{}") return;
    const timer = setTimeout(runWoken, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [wokenKey, created]);

  const setupInterrupted = setupView?.status === "cancelled";
  useEffect(() => {
    if (!setupRunId || !setupInterrupted) return;
    setSetupAttached(false);
    const timer = setTimeout(() => {
      dispatch(detachWorkflowRunState(setupRunId));
      setSetupAttached(true);
    }, ADOPTION_RELEASE_GRACE_MS + 1_000);
    return () => clearTimeout(timer);
  }, [setupRunId, setupInterrupted, dispatch]);

  const decide = (key: string, decision: Decision) => setDecisions((d) => applyDecision(d, items, key, decision));

  /** "Custom": the person's own values land in their slots, confirmed — the main one when the slot has none. */
  const addCustom = (added: EvidenceItem | EvidenceItem[]) => {
    const list = Array.isArray(added) ? added : [added];
    const next = mergeEvidence(items, list);
    setItems(next);
    setDecisions((d) => {
      let out = d;
      for (const item of list) {
        const single = ["name", "tagline", "description", "category", "website"].includes(item.field);
        const hasPreferred = [...next.values()].some((i) => i.field === item.field && out[i.key] === "preferred");
        out = applyDecision(out, next, item.key, single && !hasPreferred ? "preferred" : "yes");
      }
      return out;
    });
  };

  /** Compare view: claim or reject everything one source (the site, a profile) found. */
  /** Compare view: one candidate is ours (everything its page said) or not us (what only it said). */
  const claim = (c: Candidate, decision: "yes" | "no") => {
    setRelations(({ [c.id]: _drop, ...rest }) => rest);
    setDecisions((d) => {
      const next = { ...d };
      if (decision === "no") {
        // Pressing "Not us" again clears it.
        const undo = d[c.anchor.key] === "no";
        for (const k of c.ownKeys) {
          if (undo) delete next[k];
          else next[k] = "no";
        }
        return next;
      }
      if (d[c.anchor.key] === "yes" || d[c.anchor.key] === "preferred") {
        for (const k of c.ownKeys) if (next[k] === "yes") delete next[k];
        return next;
      }
      for (const i of c.items) {
        if (i.field === "name") continue;
        if (!next[i.key] || next[i.key] === "no") next[i.key] = "yes";
      }
      return next;
    });
  };

  /** Compare view: related in a named way — neither ours nor "not us"; clears its own answers. */
  const relate = (c: Candidate, relation: Relation | null) => {
    setDecisions((d) => {
      const next = { ...d };
      for (const k of c.ownKeys) delete next[k];
      return next;
    });
    setRelations(({ [c.id]: _drop, ...rest }) => (relation ? { ...rest, [c.id]: { candidate: c, relation } } : rest));
  };

  // ── derived ─────────────────────────────────────────────────────────────

  const roundViews = rounds.map((r) => (r.runId ? views[r.runId] : undefined));
  const TERMINAL = ["completed", "failed", "errored", "cancelled", "stopped", "refused"];
  // A round with a run id but no first update yet is still working (never "nothing found" for a beat).
  const working =
    rounds.some((r) => !r.error && (!r.runId || !views[r.runId])) ||
    roundViews.some((v) => !!v && !TERMINAL.includes(v.status ?? ""));
  const failedRound =
    rounds.some((r) => Boolean(r.error)) || roundViews.some((v) => roundFailed(v));
  const progressLines = roundViews
    .flatMap((v) => v?.steps ?? [])
    .filter((s) => s.phase === "running" && s.progress)
    .map((s) => s.progress as string);
  const costUsd = roundViews.reduce((sum, v) => sum + (v?.steps.reduce((s, x) => s + x.costUsd, 0) ?? 0), 0);
  const visible = orderedEvidence(items.values());
  const basics = confirmedBasics(items, decisions, person);
  // The landing card shows the best found name and logo until the person confirms their own, so
  // what the stage found has a real place to land (it is never created from these: Create reads basics).
  const foundLogo = stageLogo([...items.values()]);
  const foundName = stageName([...items.values()]);
  const cardBasics =
    basics.name && basics.images.length
      ? basics
      : {
          ...basics,
          name: basics.name ?? foundName?.value ?? null,
          images: basics.images.length
            ? basics.images
            : foundLogo?.image_url
              ? [{ url: foundLogo.image_url, kind: "logo" as const, primary: true, source: foundLogo.source.where }]
              : [],
        };
  // Recent posts fetched per confirmed account after Create: its own setting (platform 30, org/person override).
  const postsKnob = Number(useSessionKnob("social.smart_add_posts_default"));
  const postsPerAccount = Number.isFinite(postsKnob) && postsKnob >= 0 ? postsKnob : 30;
  const spendOrg = useAppSelector((st) => st.appContext?.organization_id ?? null);
  const spend = useSocialSpend(spendOrg);
  const trackedAccounts = basics.accounts.filter((a) => a.platform);
  const postsPoints = postsPerAccount
    ? trackedAccounts.map((a) => spend.postsText(a.platform ?? "", postsPerAccount)).filter(Boolean)
    : [];
  const situation = situationOf(visible, rounds.length > 0 && !working);
  // One vocabulary for every found thing (web.brand_relation_kind) — the web step answers from it too.
  const { kinds: relationKinds } = useRelationKinds(relate);
  const webCtx = suggestContext(
    [basics.websiteUrl, ...basics.otherWebsites, typedWebsite || null],
    basics.accounts.map((a) => a.url ?? a.value),
    basics.name ?? foundName?.value ?? null,
  );
  const webItems = visible.filter((i) => i.field === "listing" || i.field === "mention" || i.field === "web_page");
  const webSuggestions = Object.fromEntries(webItems.map((i) => [i.key, suggestKind(i, relationKinds, webCtx)]));
  useEffect(() => {
    if (!builder.isActive) return;
    // The publisher is admin-only code: it loads on first use, never for anyone else.
    const state = {
      inputs: { website: websiteText, social: socialText, platform: picked, person },
      rounds,
      setup: setupRunId ? { runId: setupRunId } : null,
      items: [...items.values()],
      decisions,
      relations,
      web: { choices: webChoices, suggestions: webSuggestions, context: webCtx },
      basics,
      created,
      provisionPoint: BRAND_INTAKE_POINT,
    };
    void import("./builderFeed").then((m) => m.publishSmartAddFeed(builder.publish, state));
  });
  const canCreate = Boolean(basics.name) && !creating && !created;

  // ── create ──────────────────────────────────────────────────────────────

  const create = async () => {
    if (!basics.name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const organizationId = await ensureOrgId(null);
      // "Related" candidates the person answered (only ones still unanswered elsewhere count).
      const related = Object.values(relations).filter((r) => !decisions[r.candidate.anchor.key]);
      // Web results answered founder / key person route to people exactly like an account does.
      const kindOf = (key: string) => relationKinds.find((k) => k.key === webChoices[key]?.kind);
      for (const i of webItems) {
        const k = kindOf(i.key);
        if (k && (k.routesTo === "owns" || k.routesTo === "key_person")) {
          related.push({ candidate: webCandidate(i), relation: { key: k.key, label: k.label, routesTo: k.routesTo } });
        }
      }
      const competitors = [
        ...relatedCompetitors(related),
        ...webItems
          .filter((i) => kindOf(i.key)?.routesTo === "competitor")
          .map((i) => ({ name: i.label ?? websiteHost(i.url ?? i.value), domain: websiteHost(i.url ?? i.value) })),
      ];
      // A web result answered "Ours" that is a site of its own becomes one of the brand's websites.
      const webSites = webItems
        .filter((i) => kindOf(i.key)?.routesTo === "brand_property")
        .map(webSiteRoot)
        .filter((u): u is string => Boolean(u) && !webCtx.ourHosts.includes(websiteHost(u as string)));
      const brand = await createBrand({
        organizationId,
        name: basics.name,
        kind: person ? "person" : "company",
        industry: basics.category,
        description: basics.description,
        websiteUrl: basics.websiteUrl,
        // The confirmed logo is saved by the setup run as a durable file, never an expiring link.
        logoUrl: null,
        faviconUrl: null,
        ogImageUrl: null,
        notes: null,
        status: "active",
        // Aliases live where every brand reader looks for them (web.brand.profile.brand_aliases).
        // Aliases and expertise live where every brand reader looks for them (web.brand.profile).
        ...(basics.aliases.length || basics.expertise.length || competitors.length
          ? {
              profile: {
                ...(basics.aliases.length ? { brand_aliases: basics.aliases } : {}),
                ...(basics.expertise.length ? { expertise_areas: basics.expertise } : {}),
                ...(competitors.length ? { competitors } : {}),
              },
            }
          : {}),
      });
      const problems: string[] = [];
      const accounts: { handle_or_url: string; platform: string; property_id: string }[] = [];
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
          if (item.platform) accounts.push({ handle_or_url: item.url ?? item.value, platform: item.platform, property_id: row.id });
        } catch (error) {
          problems.push(`@${item.handle ?? ""}: ${extractErrorMessage(error)}`);
        }
      }
      // The primary website and every other confirmed domain become the brand's sites; the primary
      // one then gets the real crawl (tier 3) in the background.
      // Every confirmed website (found or typed) becomes one of the brand's sites, and EVERY one gets
      // the normal default crawl in the background (tier 3) — none of it blocks.
      const siteIds: string[] = [];
      for (const url of [basics.websiteUrl, ...basics.otherWebsites, ...webSites].filter((u): u is string => Boolean(u))) {
        try {
          const parsedUrl = normalizeWebsiteUrl(url);
          const site = await createSite({
            organizationId,
            name: parsedUrl.hostname,
            rootUrl: parsedUrl.toString(),
            domain: parsedUrl.hostname.toLowerCase(),
            brandId: brand.id,
          });
          // An address already saved as a site comes back as that site: link it to THIS brand.
          if (site.brand_id !== brand.id) await moveSiteBrand(site.id, brand.id);
          siteIds.push(site.id);
        } catch (error) {
          problems.push(`${websiteHost(url)}: ${extractErrorMessage(error)}`);
        }
      }
      if (siteIds.length) {
        setCrawl("running");
        Promise.allSettled(siteIds.map((id) => initializeSite(id))).then((results) => {
          const failedCrawls = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
          setCrawl(failedCrawls.length === results.length ? "failed" : "done");
          setCrawlNote(
            failedCrawls.length
              ? `${failedCrawls.length} of ${results.length} failed: ${extractErrorMessage(failedCrawls[0].reason)}`
              : `${results.length} site${results.length === 1 ? "" : "s"}`,
          );
        });
      }
      // Nothing is lost: every finding the person did not answer is kept as a candidate in the
      // brand's discovery inbox (web.discovered_item); only "Not us" is left out.
      // Related items keep their relationship (and land in their home: people, competitors).
      const relatedSaved = await routeRelated(organizationId, brand.id, related, decisions);
      problems.push(...relatedSaved.problems);
      // Every answered web result keeps its answer, sentiment and where it was found; "Not us" (here and
      // in the compare rows) also lands on the brand's exclusion list.
      const webSaved = await routeWebChoices(organizationId, brand.id, webItems, webChoices, relationKinds, webSuggestions);
      problems.push(...webSaved.problems);
      for (const k of webSaved.keys) relatedSaved.keys.add(k);
      problems.push(...(await excludeNotUs(organizationId, brand.id, [...items.values()], decisions)));
      problems.push(
        ...(await saveCandidates(
          organizationId,
          brand.id,
          [...items.values()].filter((i) => !decisions[i.key] && !relatedSaved.keys.has(i.key) && !brokenKeys.current.has(i.key)),
        )),
      );
      problems.push(...(await saveFacts(organizationId, brand.id, basics)));
      setSaveNotes(problems);
      setCreated(brand);
      onCreated?.(brand);
      if (basics.images.length || accounts.length) {
        try {
          const { runId } = await startSystemRun(
            dispatch,
            SETUP_KEY,
            {
              subject: `brand:${brand.id}`,
              organizationId,
              sourceFeature: "marketing",
              inputs: {
                brand_id: brand.id,
                images: basics.images,
                accounts,
                max_posts: postsPerAccount,
                // Where each basic came from and how sure the extractor was — the setup's
                // "Confirm your brand profile basics" gate shows both beside each item.
                evidence: [...items.values()].map((i) => ({
                  field: i.field,
                  value: i.value,
                  confidence: i.confidence,
                  source: i.source.where ?? i.source.kind,
                })),
              },
            },
            "The background setup could not start.",
          );
          setSetupRunId(runId);
        } catch (error) {
          setSaveNotes((n) => [...n, plainStartError(error)]);
        }
      }
      await showProvision(brand, organizationId, "created");
    } catch (error) {
      setCreateError(extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  // PROVISION POINT — brand_intake.smart_add_create. This is where the brand-intake analysis
  // would run. No agent runs (Arman, 2026-10-12): the exact values available here are captured
  // and shown in the Provision window. Spec: smart-add-brand/PROVISION.md.
  const showProvision = async (
    brand: MarketingBrand,
    organizationId: string,
    trigger: "created" | "manual",
  ) => {
    setCapturing(true);
    try {
      const snapshot = await captureProvision(dispatch, BRAND_INTAKE_POINT, brand.id, organizationId, trigger);
      builder.publish({
        key: `provision.${snapshot.id}`,
        label: `Provision: ${brand.name}`,
        group: "provision",
        data: { snapshotId: snapshot.id, point: BRAND_INTAKE_POINT, trigger },
        source: BRAND_INTAKE_POINT,
        ref: { type: "provision_snapshot", id: snapshot.id },
      });
      setProvisionTick((t) => t + 1);
      openProvision(snapshot.id, `Brand analysis inputs: ${brand.name}`);
    } catch (error) {
      setSaveNotes((n) => [...n, extractErrorMessage(error)]);
    } finally {
      setCapturing(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────

  const showPicker = needsPlatformPick(parsed, null);

  // The intake stage until a real finding exists; it holds a beat while findings stream in (the
  // logo, name and accounts gather in the centerpiece), then ONE morph into the structured page:
  // every finding shown on the stage flies to its slot as a shared element (motion layoutId,
  // stage/Shared.tsx) and the rest of the page rises in after. Reduced motion swaps instantly.
  const [structured, setStructured] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  // Something to show = a real finding or an answer the person gave (the quick questions);
  // never the address they typed echoed back.
  const hasFindings = [...items.values()].some((i) => i.source.where !== "the address itself");
  const firstFindingAt = useRef<number | null>(null);
  // The hold clock starts when the stage has something to SHOW (a logo, a name, an account) — a
  // phone number read off the page counts as a finding but never appears on the stage.
  const showable =
    Boolean(foundLogo || foundName) ||
    [...items.values()].some((i) => i.field === "social" && i.source.kind !== "typed" && i.source.where !== "the address itself");
  useEffect(() => {
    if (structured || !hasFindings) return;
    if (rounds.length && working && !showable) return;
    firstFindingAt.current ??= Date.now();
    const held = Date.now() - firstFindingAt.current;
    const wait = rounds.length ? Math.max(STAGE_HOLD_MS - held, 0) : STAGE_ANSWER_MS;
    const timer = setTimeout(() => setStructured(true), wait);
    return () => clearTimeout(timer);
  }, [hasFindings, structured, rounds.length, working, showable]);
  useLayoutEffect(() => {
    if (structured) riseIn(pageRef.current);
  }, [structured]);
  const nothingFound = rounds.length > 0 && !working && !hasFindings;
  const listeners = (
    <>
      {setupRunId && setupAttached ? (
        <SmartAddRound
          key={setupRunId}
          runId={setupRunId}
          steps={SETUP_STEPS}
          onView={(view) => setSetupView((v) => (JSON.stringify(v) === JSON.stringify(view) ? v : view))}
        />
      ) : null}
      {rounds.map((r) =>
        r.runId ? <SmartAddRound key={r.runId} runId={r.runId} onEvidence={onEvidence} onView={onView} /> : null,
      )}
    </>
  );
  if (!structured) {
    return (
      <>
        <SmartAddHero
          person={person}
          onPerson={setPerson}
          onWebsite={setWebsiteText}
          onSocial={setSocialText}
          onPick={setPicked}
          working={working}
          views={roundViews.filter((v): v is RoundView => Boolean(v))}
          items={visible}
          nothingFound={nothingFound}
          failed={failedRound}
          onAdd={addCustom}
        />
        {listeners}
      </>
    );
  }
  // Honest run state: finished, failed, interrupted (a restart — the platform resumes it), or working.
  const setupStatus = setupView?.status ?? "";
  const setupState: "working" | "done" | "failed" | "interrupted" =
    setupStatus === "completed"
      ? "done"
      : ["failed", "errored", "refused", "stopped"].includes(setupStatus)
        ? "failed"
        : setupStatus === "cancelled"
          ? "interrupted"
          : "working";

  return (
    <div className="relative px-4 pb-8 pt-[calc(var(--shell-header-h)+1rem)]" data-smart-add-stage="structured">
    <div ref={pageRef} className="mx-auto flex w-full max-w-3xl flex-col gap-3" data-testid="smart-add-brand">
      <div className="self-start">
      <SegmentedControl
        aria-label="Brand kind"
        value={person ? "person" : "company"}
        onValueChange={(v) => setPerson(v === "person")}
        data={[
          { value: "company", label: "Company" },
          { value: "person", label: "Person" },
        ]}
      />
      </div>
      <Shared id="signals" as="div" className="grid gap-3 rounded-xl sm:grid-cols-2">
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
      </Shared>

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

      {/* The brand as it stands: the primary choices, building as the person confirms. */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
      <BrandCard basics={cardBasics} person={person} location={basics.facts.find((f) => f.field === "address")?.value ?? null} />
      </div>
      <p className="text-xs text-muted-foreground">Everything found is kept — only “Not us” is left out.</p>

      {situation === "new" ? (
        // Brand-new: little to find, so three quick questions fill the essentials in place.
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border py-3 text-sm" data-testid="smart-add-situation">
          <span className="px-4 font-medium">Not much out there yet — three quick questions</span>
          <CustomAdd field="name" label={person ? "Your name" : "Business name"} placeholder={person ? "Your name" : "Business name"} onAdd={addCustom} />
          <CustomAdd field="description" label="What you do" placeholder="What you do, in a sentence" onAdd={addCustom} />
          <CustomAdd field="address" label="Where you are" placeholder="City or street address" onAdd={addCustom} />
        </div>
      ) : situation === "conflicted" || comparing ? (
        // Once open, the compare stays put while answers start new lookups.
        <div className="flex flex-col gap-3" data-testid="smart-add-situation">
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-2 text-sm">
            <span className="font-medium">Some of these may be someone else</span>
            <Button variant="outline" className="ml-auto" onClick={() => setComparing((c) => !c)}>
              {comparing ? "Back to sections" : "Compare side by side"}
            </Button>
          </div>
          {comparing ? (
            <CompareSources
              items={visible}
              decisions={decisions}
              relations={Object.fromEntries(Object.entries(relations).map(([k, r]) => [k, r.relation]))}
              onClaim={claim}
              onRelate={relate}
            />
          ) : null}
        </div>
      ) : situation === "established" ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm" data-testid="smart-add-situation">
          <span className="font-medium">We found plenty.</span>{" "}
          <span className="text-muted-foreground">Check the card, star your main picks and create.</span>
        </div>
      ) : null}

      <div
        className="rounded-xl border border-border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
        data-testid="smart-add-results"
      >
        <SmartAddSlots
          items={visible}
          decisions={decisions}
          working={working}
          started={rounds.length > 0}
          locked={Boolean(created)}
          person={person}
          onDecide={(key, d) => {
            // Ours / Not us replaces "Related" for that account.
            setRelations(({ [key]: _drop, ...rest }) => rest);
            decide(key, d);
          }}
          relations={Object.fromEntries(Object.entries(relations).map(([k, r]) => [k, r.relation]))}
          onRelate={relate}
          onAdd={addCustom}
          onBroken={(key) => brokenKeys.current.add(key)}
        />
      </div>

      <SmartAddGateLine views={roundViews.filter((v): v is RoundView => Boolean(v))} />
      <SmartAddWebRow
        items={visible}
        kinds={relationKinds}
        choices={webChoices}
        ctx={webCtx}
        onChoose={(item, choice) =>
          setWebChoices(({ [item.key]: _drop, ...rest }) => (choice ? { ...rest, [item.key]: choice } : rest))
        }
      />
      <SmartAddBioLinks items={visible} />

      {/* Create: the confirmed basics, one row. */}
      <div className="sticky bottom-3 z-10 flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {basics.logoUrl ? (
            <img src={basics.logoUrl} alt="" className="size-6 shrink-0 rounded object-contain" />
          ) : null}
          <span className="truncate font-medium">{basics.name ?? "Confirm a name to create the brand"}</span>
          {basics.name && trackedAccounts.length && !created ? (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline" data-testid="smart-add-posts-preview">
              {postsPerAccount
                ? `Then ${postsPerAccount} recent posts per account${postsPoints.length ? ` · ${postsPoints.join(" + ")}` : ""}`
                : "No post history (setting is 0)"}
            </span>
          ) : null}
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
      {createError ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          {createError}
          <ErrorAlchemyMenu error={createError} />
        </p>
      ) : null}

      {saveNotes.length ? (
        <ul className="flex flex-col gap-0.5 text-xs text-destructive">
          {saveNotes.slice(0, 3).map((n) => (
            <li key={n} className="truncate" title={n}>
              {n}
            </li>
          ))}
        </ul>
      ) : null}

      {setupRunId || crawl !== "idle" ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs" data-testid="smart-add-background">
          <div className="flex items-center gap-2">
            {setupState === "done" ? (
              <Check className="size-3.5 text-primary" />
            ) : setupState === "failed" ? (
              <X className="size-3.5 text-destructive" />
            ) : setupState === "interrupted" ? (
              <RotateCcw className="size-3.5 text-muted-foreground" />
            ) : (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            )}
            <span className="font-medium">{SETUP_STATE_LABEL[setupState]}</span>
            {setupRunId ? (
            <a
              href={runHref(setupRunId)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 font-medium text-primary"
            >
              Watch <ExternalLink className="size-3" />
            </a>
            ) : null}
          </div>
          {crawl !== "idle" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-32 shrink-0 truncate">Site crawl</span>
              <span className="w-16 shrink-0">{crawl === "running" ? "Working" : crawl === "done" ? "Done" : "Failed"}</span>
              <span className="min-w-0 flex-1 truncate" title={crawlNote ?? undefined}>
                {crawlNote ?? ""}
              </span>
            </div>
          ) : null}
          {(setupView?.steps ?? []).map((step) => (
            <div key={step.step} className="flex items-center gap-2 text-muted-foreground">
              <span className="w-32 shrink-0 truncate">{SETUP_STEP_LABEL[step.step] ?? step.step}</span>
              <span className="w-16 shrink-0">{step.skipped ? "Skipped" : STEP_PHASE_LABEL[step.phase] ?? step.phase}</span>
              <span className="min-w-0 flex-1 truncate">{step.notes[0] ?? step.progress ?? ""}</span>
              <span className="shrink-0 tabular-nums">{step.costUsd > 0 ? format(step.costUsd) : ""}</span>
            </div>
          ))}
        </div>
      ) : null}

      {created ? (
        <section className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs" data-testid="smart-add-provision" aria-label="Brand analysis inputs">
          <span className="font-semibold">Brand analysis</span>
          <span className="text-muted-foreground">Not running · inputs only</span>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <ProvisionCaptures
              pointKey={BRAND_INTAKE_POINT}
              subjectId={created.id}
              title={`Brand analysis inputs: ${created.name}`}
              refreshKey={`${provisionTick}:${setupState}`}
            />
            <Button
              variant="outline"
              disabled={capturing}
              onClick={() => void ensureOrgId(null).then((org) => showProvision(created, org, "manual"))}
            >
              {capturing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Capture again
            </Button>
          </div>
        </section>
      ) : null}

      {listeners}
    </div>
    </div>
  );
}

const STEP_PHASE_LABEL: Record<string, string> = {
  idle: "Waiting",
  running: "Working",
  retrying: "Retrying",
  settled: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

/** A start failure in plain words; a server without Smart Add says so. */
function plainStartError(error: unknown): string {
  const message = extractErrorMessage(error);
  return /not found|unknown_system_workflow/i.test(message)
    ? "This server doesn't have Smart Add yet. Switch servers or try again after the next release."
    : message;
}

/** Confirmed phone / email / address → the brand's business facts and its primary location. */
async function saveFacts(
  organizationId: string,
  brandId: string,
  basics: ReturnType<typeof confirmedBasics>,
): Promise<string[]> {
  const problems: string[] = [];
  if (basics.tagline) {
    try {
      await createBusinessFact({ organizationId, brandId, kind: "tagline", label: null, value: basics.tagline });
    } catch (error) {
      problems.push(`tagline: ${extractErrorMessage(error)}`);
    }
  }
  for (const fact of basics.facts) {
    try {
      await createBusinessFact({
        organizationId,
        brandId,
        kind: fact.field as "phone" | "email" | "address",
        label: null,
        value: fact.value,
      });
    } catch (error) {
      problems.push(`${fact.field}: ${extractErrorMessage(error)}`);
    }
  }
  const first = (field: string) => basics.facts.find((f) => f.field === field)?.value ?? null;
  const street = first("address");
  const phone = first("phone");
  const email = first("email");
  if (street || phone) {
    try {
      const location = await createBusinessLocation({ organizationId, brandId, name: basics.name ?? "Main location" });
      await updateBusinessLocation({
        locationId: location.id,
        expectedVersion: location.version,
        patch: {
          is_primary: true,
          ...(street ? { street_address: street } : {}),
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
          ...(basics.websiteUrl ? { website_url: basics.websiteUrl } : {}),
          ...(basics.category ? { business_type: basics.category } : {}),
          ...(basics.description ? { description: basics.description } : {}),
        },
      });
    } catch (error) {
      problems.push(`Location: ${extractErrorMessage(error)}`);
    }
  }
  return problems;
}

const SETUP_STATE_LABEL = {
  working: "Still working in the background",
  done: "Setup finished",
  failed: "Setup stopped — open Watch to retry",
  interrupted: "Interrupted — resumes automatically",
} as const;

const SETUP_STEP_LABEL: Record<string, string> = {
  logo: "Images",
  accounts: "Accounts",
  history: "Post history",
  inputs: "Analysis inputs",
};

/** Every unanswered finding, kept in the brand's discovery inbox (web.discovered_item, pending). */
async function saveCandidates(organizationId: string, brandId: string, items: EvidenceItem[]): Promise<string[]> {
  if (!items.length) return [];
  try {
    await createDiscoveredCandidates(
      items.map((i) => ({
        organizationId,
        brandId,
        source: "smart_add",
        category: candidateCategory(i.field),
        guessedKind: i.field === "social" ? (i.platform ?? "social") : i.field,
        url: i.url ?? (i.field === "logo" ? (i.image_url ?? i.value) : null),
        value: { text: i.value, label: i.label, handle: i.handle, followers: i.followers },
        context: {
          where: i.source.where,
          found_on: i.source.url,
          step: i.source.node,
          ...(i.hits?.length ? { search: { engines: i.engines ?? [], hits: i.hits, snippet: i.snippet ?? null } } : {}),
        },
        confidence: i.confidence,
      })),
    );
    return [];
  } catch (error) {
    return [`Unreviewed findings: ${extractErrorMessage(error)}`];
  }
}
