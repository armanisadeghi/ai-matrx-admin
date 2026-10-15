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

import { toPropertyKind } from "@/features/marketing/components/shared/PropertyKindMark";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Globe, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Button, Field, SegmentedControl, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useWorkflowRunControls } from "@/features/workflow-runtime/hooks/useWorkflowRunControls";
import { isFailedEntry, quietMs, sessionEntry, siteReadFailure, siteReadLine, stepCouldNotRead } from "./entryOutcome";
import { useAppDispatch } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { extractErrorMessage } from "@/utils/errors";
import { planKeptFacts, saveKeptFacts } from "./keptFacts";
import { probeFromDraft, type BrandMatch, type BrandProbe } from "./brandMatch";
import { findMatchingBrands } from "./brandMatchLive";
import { gateCreate } from "./createGate";
import { useExistingBrands } from "./useExistingBrands";
import { ExistingBrandNotice } from "./ExistingBrandNotice";
import { smartAddEnrichHref } from "./smartAddUrl";
import { factSlotKey, typedWebsiteItem } from "./firstData";
import { categoriesFor, liveKnownDomainRules } from "@/lib/web-domains/registry";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatCount } from "@ai-matrx/kit/format";
import { startSystemRun } from "@/features/education/kits/systemRuns";
import { withoutOwnAccountRows } from "./ownAccountRows";
import {
  createBrand,
  createBusinessFact,
  createBusinessLocation,
  createProperty,
  createDiscoveredCandidates,
  updateBusinessLocation,
} from "@/features/marketing/data/service";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { roundFailed } from "./roundFailure";
import { SmartAddSlots } from "./SmartAddSlots";
import { typedItems, useRunMemory, type WebMark } from "./runMemory";
import { withoutStaffFacts } from "./staff";
import { claimSite } from "./siteOwnership";
import { liveSiteClaimDeps } from "./siteOwnershipLive";
import type { KeyPerson } from "./keyPeople";
import { SmartAddHero, stageLogo, stageLogos, stageName, type PersonMore } from "./SmartAddHero";
import { Shared, riseIn } from "./stage/Shared";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { useAppSelector } from "@/lib/redux/hooks";
import { useSocialSpend } from "@/features/marketing/social/cost";
import { BrandCard, CustomAdd, situationOf } from "./SmartAddExtras";
import { CompareDialog } from "./compare/CompareDialog";
import { compareSlots, isAnswered } from "./compare/compareSlots";
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
  isSocialPlatform,
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  TRACKABLE_PLATFORMS,
  type SocialPlatform,
} from "@/features/marketing/social/types";
import type { MarketingBrand } from "@/features/marketing/types";
import {
  FIELD_LABEL,
  applyDecision,
  candidateCategory,
  bestFindingHints,
  confirmedBasics,
  mergeEvidence,
  nextRoundSeeds,
  autoWork,
  nameAnchors,
  releaseChanged,
  orderedEvidence,
  withoutNonContactEmails,
  withoutRepeatedText,
  seedKeys,
  linkPages,
  websiteHost,
  type Decision,
  type EvidenceItem,
  type LibraryImage,
  type RoundSeeds,
  type SocialSeed,
  type ConfirmedFacts,
  type Candidate,
  type Relation,
  customItem,
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
import { useEntityKindLabel } from "./entityKind";
import { suggestKind, type WebChoice } from "./webKinds";
import { recordWebAnswers, teachFediverseHost } from "./learnDomains";
import { learnFediverseFromText } from "@/features/marketing/social/fediverse";
import {
  SETUP_STEPS,
  SmartAddRound,
  type BrandScreenshots,
  type PersonSignals,
  type RoundPath,
  type RoundView,
} from "./SmartAddRound";
import { PersonHarderStage } from "./harder/PersonHarderStage";
import type { FindYouProvision, FocusState } from "./harder/types";
import type { SweepFeed } from "@/features/builder-panel/components/BuilderDecisionsTab";
import { FullNameAsk } from "./FullNameAsk";
import { siteNameOf } from "./siteName";
import { WebPersonAsk } from "./WebPersonAsk";
import { personNameOnPage } from "./personParty";
import type { NameStrength } from "./nameStrength";
import type { FindLogEntry, HarderCandidate } from "./harder/types";
import { AnchorCards, anchorItems, type AnchorAnswer } from "./AnchorCards";
import type { PersonAnchors } from "./anchorRank";
import { autoEscalation, nextPersonRung } from "./harder/escalation";
import { HelpersMenu } from "./helpers/HelpersMenu";
import { candidateItem } from "./helpers/candidateItem";
import { onHelperAnswer, resetHelperAnswers, setHelperContext } from "./helpers/store";
import { SmartAddGateLine } from "./SmartAddGateLine";
import { SmartAddBioLinks } from "./SmartAddBioLinks";
import { linkInBioService } from "@/features/marketing/lib/link-in-bio";
import { SmartAddWebRow } from "./SmartAddWebRow";
import { captureProvision } from "@/features/provision-window/data";
import { autoOpenHasRoom, markAutoOpened } from "@/features/window-panels/utils/autoOpenPlacement";
import { DEFAULT_INSTANCE_ID } from "@/lib/redux/slices/overlaySlice";
import { useOpenProvisionWindow } from "@/features/overlays/openers/provisionWindow";
import { ProvisionCaptures } from "@/features/provision-window/ProvisionCaptures";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { SMART_ADD_SURFACE } from "./builderSurface";
import { SmartAddValidate } from "./validate/SmartAddValidate";
import { coreSettled, mergeFacts, type BrandFact } from "./validate/queue";
import { knownDecided, withSuggestions, type WeThinkSuggestion } from "./weThink";
import type { BrandSnapshot, EnrichSeed, KnownFact } from "./enrich/known";
import { computeEnrichDiff } from "./enrich/diff";
import { ChangesReview } from "./enrich/ChangesReview";
import { browserImageUrl } from "@/lib/media/external-image";
import type { SmartAddAddressBinding } from "./useSmartAddAddress";
import { SMART_ADD_ADDRESS_DEBOUNCE_MS, type SmartAddAddress } from "./smartAddUrl";

/** Enrich an existing brand (ENRICH.md): what we already know, the checked facts' seed, and the brand. */
export interface SmartAddEnrich {
  snapshot: BrandSnapshot;
  known: KnownFact[];
  checked: ReadonlySet<string>;
  seed: EnrichSeed;
}

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

/** A resumed address (`?run=`): the first round's seeds and typed keys, rebuilt from the typed fields. */
function resumeTyped(a: SmartAddAddress): { seeds: RoundSeeds; keys: { website: string | null; social: string | null } } {
  const bio = a.prefill.social && linkInBioService(a.prefill.social) ? a.prefill.social.trim() : "";
  const site = a.prefill.website && /\.[a-z]{2,}/i.test(a.prefill.website) ? a.prefill.website : bio;
  const parsed = resolveAccountInput({ text: a.prefill.social ?? "", picked: a.prefill.platform ?? null });
  const social = parsed.status === "ok" ? { handle_or_url: parsed.url, platform: parsed.platform } : null;
  return {
    seeds: { website: site, socials: social ? [social] : [] },
    keys: { website: site ? `website:${websiteHost(site)}` : null, social: parsed.status === "ok" ? `social:${accountKey(parsed)}` : null },
  };
}

/** `url`: the Smart Add page's address binding (useSmartAddAddress); absent in enrich and the lab. */
export function SmartAddBrand({
  onCreated,
  onValidating,
  enrich = null,
  url = null,
}: {
  onCreated?: (brand: MarketingBrand) => void;
  /** Create settled the core and the validation stage is up: the page moves the address to the brand's validate route. */
  onValidating?: (brand: MarketingBrand) => void;
  enrich?: SmartAddEnrich | null;
  url?: SmartAddAddressBinding | null;
}) {
  const dispatch = useAppDispatch();
  const { format } = useCostDisplay();
  const runControls = useWorkflowRunControls();
  // The quiet-time knob: this long with no new step while a round runs, the stage says it is still working.
  const stallMs = quietMs(useSessionKnob("marketing.smart_add_quiet_seconds"));

  // An address carrying `run=` resumes those rounds from the server (a reload, a shared link, Back).
  const [resume] = useState(() => (url && url.address.runs.length ? { address: url.address, typed: resumeTyped(url.address) } : null));
  const resumePerson = resume?.address.mode === "person" && resume.address.prefill.name ? resume.address.prefill : null;
  const [websiteText, setWebsiteText] = useState(resume?.address.prefill.website ?? "");
  const [socialText, setSocialText] = useState(resume?.address.prefill.social ?? "");
  const [picked, setPicked] = useState<SocialPlatform | null>(resume?.address.prefill.platform ?? null);
  const parsed = resolveAccountInput({ text: socialText, picked });

  // A personal brand: a headshot instead of a logo, and expertise.
  const [personLocal, setPersonLocal] = useState(enrich?.snapshot.brand.kind === "person");
  // On the Smart Add page the address IS the kind (/person or /company; a push, so Back flips it back).
  // The address leaves /company|/person for /validate/<brand> after Create; the kind it had stays.
  const lastMode = useRef(url?.address.mode ?? null);
  if (url?.address.mode) lastMode.current = url.address.mode;
  const person = url ? lastMode.current === "person" : personLocal;
  const setPerson = (p: boolean) => (url ? url.setMode(p ? "person" : "company") : setPersonLocal(p));
  // The compare dialog rides the address (`?view=compare`): a link opens it, Back closes it.
  const [comparingLocal, setComparingLocal] = useState(false);
  const comparing = url ? url.address.view === "compare" : comparingLocal;
  const setComparing = (on: boolean) => (url ? url.setView(on ? "compare" : null) : setComparingLocal(on));
  const [rounds, setRounds] = useState<Round[]>(() =>
    (resume?.address.runs ?? []).map((runId, i) => ({
      id: `resume:${runId}`,
      runId,
      seeds: i === 0 && resume ? resume.typed.seeds : { website: "", socials: [] },
      error: null,
    })),
  );
  const [views, setViews] = useState<Record<string, RoundView>>({});
  // Enrich: the checked known facts start as confirmed items (the person's own answers, already given).
  const [items, setItems] = useState<Map<string, EvidenceItem>>(() => new Map((enrich?.seed.items ?? []).map((i) => [i.key, i])));
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => ({ ...(enrich?.seed.decisions ?? {}) }));
  const [reviewing, setReviewing] = useState(false);
  // Compare: candidates that are neither ours nor "not us" — how each relates (keyed by candidate id).
  const [relations, setRelations] = useState<Record<string, RelatedCandidate>>({});
  // "On the web": what each web result is to the brand (web.brand_relation_kind key + sentiment).
  const [webChoices, setWebChoices] = useState<Record<string, WebChoice>>({});
  // The name typed for a web result answered Founder / Key person (MKT-040): a page title is never a person's name.
  const [webPersonNames, setWebPersonNames] = useState<Record<string, string>>({});
  // "Other → Skip for now" (finding keys / compare candidate ids), "Other → Tagline" (name key -> tagline finding) and the
  // web review's Ask me later / Ignore marks: answers like the rest, saved with the run (runMemory.ts).
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [taglines, setTaglines] = useState<Record<string, EvidenceItem>>({});
  const [separated, setSeparated] = useState<Set<string>>(new Set());
  const separateLogos = (keys: string[], on: boolean) =>
    setSeparated((cur) => new Set(on ? [...cur, ...keys] : [...cur].filter((k) => !keys.includes(k))));
  const [webMarks, setWebMarks] = useState<Record<string, WebMark>>({});
  // The facts agent's findings (kind brand_basics), answered on the validation page.
  const [facts, setFacts] = useState<BrandFact[]>([]);
  // The we-think agent's suggestions per round (run id) then finding key: they only glow an option, never answer.
  // Kept per round so two rounds judging one finding never overwrite each other back and forth.
  const [suggestionsByRun, setSuggestionsByRun] = useState<Record<string, Record<string, WeThinkSuggestion>>>({});
  // After Create, once the core is settled (validate/queue VALIDATION_THRESHOLD): the focus queue.
  const [validateOrg, setValidateOrg] = useState<string | null>(null);
  const validating = Boolean(validateOrg);
  // Answers brought back by a reload / Back (runMemory): they were already acted on in the earlier visit, so they never
  // start a round, a follow-up search or AI work again. An answer the person changes now leaves this map and counts.
  const restoredDecisions = useRef<Record<string, Decision>>({});
  const explored = useRef<Set<string>>(new Set(resume ? [resume.typed.keys.website, resume.typed.keys.social].filter((k): k is string => Boolean(k)) : []));
  /** Images the screen could not load: hidden tiles, never saved as inbox candidates. */
  const brokenKeys = useRef<Set<string>>(new Set());
  const typedKeys = useRef<{ website: string | null; social: string | null }>(resume?.typed.keys ?? { website: null, social: null });
  // Confirmed facts already sent to the workflow ("name:<v>", "location:<v>"): a new one wakes its steps.
  const wokenSent = useRef<Set<string>>(
    new Set(resumePerson?.name ? [`name:${resumePerson.name}`, ...(resumePerson.city ? [`location:${resumePerson.city}`] : [])] : []),
  );
  // Person branch (PEOPLE-AND-CREATORS §3.1, Part 9): the typed name + city, the anchor round's run, and
  // whether the one grounded round (name + one confirmed anchor) has been sent.
  const personTyped = useRef<{ name: string; city: string } | null>(resumePerson?.name ? { name: resumePerson.name, city: resumePerson.city ?? "" } : null);
  // Person clues typed beside the city (Part 10): search clues only — they never ground the person.
  // An email typed in any box (VISION Part 19): rides the next round once (its free lookups run once).
  const emailPending = useRef("");
  const personMore = useRef<PersonMore>({ occupation: resumePerson?.occupation ?? "", company: resumePerson?.company ?? "", extra: "" });
  // Each round's path (brand.identify.path_decision), sent back as `path_history` so escalation fires live.
  const [pathByRun, setPathByRun] = useState<Record<string, RoundPath>>({});
  // Name strength (Report 2026-10-15): the server's verdict on the confirmed name; a weak name with nothing to
  // anchor it offers the small "Full name?" field. The typed full name is its own fact, never the display name.
  const [nameStrength, setNameStrength] = useState<NameStrength | null>(null);
  const [fullName, setFullName] = useState("");
  const [fullNameSkipped, setFullNameSkipped] = useState(false);
  // Person harder (PATHS.md person_harder): the find-you log (Builder › Decisions) and the confirmed page
  // anchors (an employer bio page or a licence record: firm, but not the person's own website).
  const [findLog, setFindLog] = useState<FindLogEntry[]>([]);
  // Hard / close-to-impossible paths: "Dig deeper" escalates on the screen; person.find_you rides the next round's
  // inputs (the mandate provisions read it); the sweep feed goes to the Builder panel.
  const [escalatedPath, setEscalatedPath] = useState<string | null>(null);
  const findYouProvision = useRef<FindYouProvision | null>(null);
  const sweepFeed = useRef<{ sweep: SweepFeed | null; focus: Record<string, FocusState> }>({ sweep: null, focus: {} });
  const [pageAnchors, setPageAnchors] = useState<string[]>([]);
  const anchorRunId = useRef<string | null>(resumePerson ? (resume?.address.runs[0] ?? null) : null);
  const groundedSent = useRef(false);
  const [affiliations, setAffiliations] = useState<string[]>([]);
  // Anchor cards answered "Namesake" (a different person with my name): web.brand_relation_kind `namesake`.
  const [namesakes, setNamesakes] = useState<Set<string>>(new Set());
  // The latest person / business verdict (brand.identify.person_signals): data only, never a question.
  const [personSignals, setPersonSignals] = useState<PersonSignals | null>(null);
  // The homepage pictured on a real browser (desktop + mobile): the card swaps it in once it lands.
  const [screenshots, setScreenshots] = useState<BrandScreenshots | null>(null);
  // "Person with a business" (a creator or solo professional): a person on the person path.
  const [kindBoth, setKindBoth] = useState(false);
  // The header label's default: the entity-kind step's answer, unless the person changed the label themselves.
  const kindLabel = useEntityKindLabel(kindBoth ? "both" : person ? "person" : "business");
  // The key-people step's people (mandate brand_intake.key_people_finder), newest round's answer.
  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([]);

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
  // Admin Builder panel: everything this screen has (no-op for everyone else).
  const builder = useBuilderFeed(SMART_ADD_SURFACE);

  // ── rounds ──────────────────────────────────────────────────────────────

  /** `firstData`: a round started from what the person typed — it wakes the facts agent at first data. */
  const startRound = async (seeds: RoundSeeds, woken: ConfirmedFacts = {}, firstData = false, find = false) => {
    // A person round carries `person`; the first round after grounding says so, once only (Part 9).
    // A person who started from a handle (no typed name) is named by the name they confirm (Part 9: a name + one anchor).
    const typed = person
      ? (personTyped.current ?? (factBasics.name ? { name: factBasics.name, city: confirmedFacts.location ?? "" } : null))
      : null;
    const nowGrounded = Boolean(typed) && (personAnchors.length > 0 || affiliations.length > 0);
    const groundedRound = !find && nowGrounded && !groundedSent.current;
    const email = emailPending.current;
    if (!seeds.website && seeds.socials.length === 0 && !woken.name && !woken.location && !find && !groundedRound && !email) return;
    emailPending.current = "";
    if (groundedRound) groundedSent.current = true;
    // The person facts agent reads the anchors' profiles from THIS round's lookups (reused within the session):
    // a grounded round woken by a name alone still carries the confirmed accounts.
    if (groundedRound && !seeds.website && seeds.socials.length === 0)
      seeds = {
        website: "",
        socials: factBasics.accounts.map((a) => ({ handle_or_url: a.url ?? a.value, ...(a.platform ? { platform: a.platform } : {}) })),
      };
    const personInput = typed
      ? {
          name: typed.name,
          ...(typed.city ? { city: typed.city } : {}),
          affiliations,
          ...(personMore.current.occupation ? { profession: personMore.current.occupation } : {}),
          ...(personMore.current.company ? { company: personMore.current.company } : {}),
          ...(personMore.current.extra ? { other: personMore.current.extra } : {}),
          anchors: personAnchors,
          ...(fullName ? { full_name: fullName } : {}),
          ...(findYouProvision.current && !find ? { find_you: findYouProvision.current } : {}),
          ...(find ? { find: true } : {}),
          ...(groundedRound ? { grounded: true, ...(anchorRunId.current ? { anchor_run_id: anchorRunId.current } : {}) } : {}),
        }
      : null;
    for (const k of seedKeys(seeds, accountSeedKey)) explored.current.add(k);
    const id = crypto.randomUUID();
    setRounds((r) => [...r, { id, runId: null, seeds, error: null }]);
    const exclude = [
      ...Object.entries(decisions)
        .filter(([key, d]) => d === "no" || !key.startsWith("social:"))
        .map(([key]) => key),
      // Enrich: the brand's NO LIST never comes back.
      ...(enrich?.seed.excludeKeys ?? []),
    ];
    const knownNow = knownDecided(withSuggestions([...items.values()], Object.assign({}, ...Object.values(suggestionsByRun))), decisions);
    try {
      // Enrich runs carry the BRAND's organization, never the active one.
      const organizationId = enrich ? enrich.snapshot.brand.organization_id : await ensureOrgId(null);
      const { runId } = await startSystemRun(
        dispatch,
        WORKFLOW_KEY,
        {
          subject: `smart_add:${id}`,
          organizationId,
          sourceFeature: "marketing",
          // `confirmed` = every fact the person confirmed; `woken` = the ones new this round, which wake
          // the confirmed-tier steps (news/videos/images, local) — the run skips the rest.
          inputs: {
            website: seeds.website,
            socials: seeds.socials,
            ...(email ? { email } : {}),
            confirmed: confirmedFacts,
            woken,
            exclude_keys: exclude,
            // The tab the person started on; the round's provision offers it (entry_kind).
            entry_kind: person ? "person" : "company",
            // What is already ours / not us: the we-think step judges new candidates against it.
            // `known.results`: web results answered or already classified, so the classifier takes the next batch.
            known: enrich
              ? {
                  ...knownNow,
                  exclusions: [...new Set([...knownNow.exclusions, ...enrich.seed.exclusions])],
                  // Known on the brand, with no evidence field of their own: people, offerings, other facts.
                  people: enrich.seed.known.people,
                  offerings: enrich.seed.known.offerings,
                  facts: enrich.seed.known.facts,
                  enrich_brand_id: enrich.snapshot.brand.id,
                }
              : knownNow,
            ...(firstData ? { first_data: true } : {}),
            ...(personInput ? { person: personInput } : {}),
            // Earlier rounds' paths, oldest first: a person round with still no anchor moves one rung down.
            ...(pathHistory.length ? { path_history: pathHistory } : {}),
          },
        },
        "Identification could not start.",
      );
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, runId } : x)));
      if (find) anchorRunId.current = runId;
    } catch (error) {
      if (groundedRound) groundedSent.current = false;
      setRounds((r) => r.map((x) => (x.id === id ? { ...x, error: plainStartError(error) } : x)));
    }
  };

  const resetAll = () => {
    setRounds([]);
    setViews({});
    viewSig.current = {};
    setItems(new Map());
    setDecisions({});
    setRelations({});
    setWebChoices({});
    setSkipped(new Set());
    setTaglines({});
    setWebMarks({});
    setFacts([]);
    setSuggestionsByRun({});
    setComparing(false);
    explored.current = new Set();
    restoredDecisions.current = {};
    restoredSeen.current = new Set();
    wokenSent.current = new Set();
    typedKeys.current = { website: null, social: null };
    personTyped.current = null;
    personMore.current = { occupation: "", company: "", extra: "" };
    setEscalatedPath(null);
    findYouProvision.current = null;
    sweepFeed.current = { sweep: null, focus: {} };
    setPathByRun({});
    setNameStrength(null);
    setFullName("");
    setFullNameSkipped(false);
    setFindLog([]);
    setPageAnchors([]);
    anchorRunId.current = null;
    groundedSent.current = false;
    setAffiliations([]);
    setNamesakes(new Set());
    setPersonSignals(null);
    setKindBoth(false);
    kindLabel.reset();
    setKeyPeople([]);
    resetHelperAnswers();
  };

  // Enrich: the first round starts from the checked websites and accounts (it wakes the facts agent like a typed one).
  const enrichStarted = useRef(false);
  const startEnrich = useEffectEvent(() => {
    const seeds = nextRoundSeeds(items, decisions, explored.current);
    void startRound(seeds, {}, true);
  });
  useEffect(() => {
    if (!enrich || enrichStarted.current) return;
    enrichStarted.current = true;
    startEnrich();
  }, [enrich]);

  // ── the address (smartAddUrl.ts): resume, then keep it current ────────────
  // A resumed person session gets back the name and city they typed, confirmed (as findPerson does).
  const primeResumedPerson = useEffectEvent(() => {
    if (!resumePerson?.name) return;
    addCustom([customItem("name", resumePerson.name), ...(resumePerson.city ? [customItem("address", resumePerson.city)] : [])]);
  });
  useEffect(() => primeResumedPerson(), []);
  const writeAddress = useEffectEvent((patch: Parameters<SmartAddAddressBinding["write"]>[0]) => url?.write(patch));
  // Every started round's run id rides the address (replace: starting a run is not a page).
  const runIds = rounds.map((r) => r.runId).filter((id): id is string => Boolean(id));
  const runKey = runIds.join(",");
  const wroteRuns = useRef(false);
  useEffect(() => {
    if (runKey) wroteRuns.current = true;
    writeAddress({ runs: runKey ? runKey.split(",") : [] });
  }, [runKey]);

  // Every answer given before Create is saved as it is given and comes back with `?run=` (runMemory.ts).
  useRunMemory(
    url && !enrich && !created ? (runIds[0] ?? null) : null,
    { decisions, webChoices, relations, namesakes: [...namesakes], typed: typedItems(items), skipped: [...skipped], taglines, webMarks, separated: [...separated], later: [] },
    (saved) => {
      const moved = Object.values(saved.taglines);
      if (saved.typed.length || moved.length) setItems((cur) => mergeEvidence(cur, [...saved.typed, ...moved]));
      setSkipped((cur) => new Set([...cur, ...saved.skipped]));
      setTaglines((cur) => ({ ...cur, ...saved.taglines }));
      setWebMarks((cur) => ({ ...cur, ...saved.webMarks }));
      setSeparated((cur) => new Set([...cur, ...saved.separated]));
      restoredDecisions.current = { ...restoredDecisions.current, ...saved.decisions };
      setDecisions((cur) => ({ ...cur, ...saved.decisions }));
      setWebChoices((cur) => ({ ...cur, ...saved.webChoices }));
      setRelations((cur) => ({ ...cur, ...saved.relations }));
      setNamesakes((cur) => new Set([...cur, ...saved.namesakes]));
    },
  );

  // Typed fields → a round, debounced. Changing a field that already ran
  // supersedes everything (a different brand); filling the other field adds a round.
  // A link-in-bio page in the social box (MKT-110) is read as the web address but stays a social link.
  const bioLink = linkInBioService(socialText) ? socialText.trim() : "";
  const typedWebsite = websiteText.trim() && /\.[a-z]{2,}/i.test(websiteText) ? websiteText.trim() : bioLink;
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
    // The typed website is a Websites row from the first moment, whether or not the site lets us read it.
    const typedSite = seeds.website ? typedWebsiteItem(seeds.website) : null;
    if (typedSite) onEvidence([typedSite]);
    void startRound(seeds, {}, true);
  });

  // A restart bumps the tick, so the same input submitted again starts a fresh round.
  const [typedTick, setTypedTick] = useState(0);
  useEffect(() => {
    if (created) return;
    if (!typedWebsiteKey && !typedSocialKey) return;
    const timer = setTimeout(runTyped, IDENTIFY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typedWebsiteKey, typedSocialKey, created, typedTick]);

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

  // When the last new step event landed (any round): the quiet clock behind "Still working…".
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const viewSig = useRef<Record<string, string>>({});
  const onView = (view: RoundView) => {
    const sig = JSON.stringify(view);
    if (viewSig.current[view.runId] === sig) return;
    viewSig.current[view.runId] = sig;
    setLastEventAt(Date.now());
    setViews((v) => ({ ...v, [view.runId]: view }));
  };

  // Confirmed websites/accounts not explored yet → the next round.
  // Any other way of changing a restored answer (not only the answer buttons) hands it back to the person.
  const restoredSeen = useRef<Set<string>>(new Set());
  useEffect(() => releaseChanged(restoredDecisions.current, restoredSeen.current, decisions), [decisions]);
  const work = autoWork(items, decisions, restoredDecisions.current, explored.current, wokenSent.current, person);
  const pending = work.seeds;
  const pendingKey = JSON.stringify(pending);
  const runPending = useEffectEvent(() => void startRound(pending));
  useEffect(() => {
    // On the validation page every confirmed site / account still wakes the next round.
    if ((created && !validating) || pendingKey === JSON.stringify({ website: "", socials: [] })) return;
    const timer = setTimeout(runPending, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [pendingKey, created, validating]);

  // The facts the person confirmed, as the identify workflow reads them.
  const factBasics = confirmedBasics(items, decisions, person);
  // A person's confirmed anchors: every confirmed account and website (Part 9 grounding).
  const personAnchors = [
    ...factBasics.accounts.map((a) => a.url ?? a.value),
    ...(factBasics.websiteUrl ? [factBasics.websiteUrl] : []),
    ...factBasics.otherWebsites,
    ...pageAnchors,
  ];
  const pathHistory = rounds
    .map((r) => (r.runId ? pathByRun[r.runId] : undefined))
    .filter((p): p is RoundPath => Boolean(p))
    .map((p) => ({ subject: p.subject, path: p.path }));
  const personPath = [...rounds].reverse().map((r) => (r.runId ? pathByRun[r.runId] : undefined)).find((p) => p?.subject === "person") ?? null;
  // Find-you mode: the person's path runs the harder rules, or one of the harder paths built on them (hard, close to
  // impossible). "Dig deeper" escalates on the screen; a path only moves down the ladder.
  const FIND_PATHS = ["person_harder", "person_hard", "person_near_impossible"];
  const decidedRank = FIND_PATHS.indexOf(personPath?.runs_as ?? "");
  const findPath = escalatedPath && FIND_PATHS.indexOf(escalatedPath) > decidedRank ? escalatedPath : (personPath?.runs_as ?? "");
  const findYou = person && Boolean(personTyped.current) && FIND_PATHS.includes(findPath);
  if (escalatedPath && pathHistory[pathHistory.length - 1]?.path !== escalatedPath) pathHistory.push({ subject: "person", path: escalatedPath });
  // What the helper windows prefill from (name, city, and the person's typed job / company).
  const helperCity = personTyped.current?.city || (factBasics.facts.find((f) => f.field === "address")?.value ?? "");
  const helperName = (person ? personTyped.current?.name : null) ?? factBasics.name ?? "";
  useEffect(() => {
    setHelperContext({
      name: helperName,
      city: helperCity,
      occupation: personMore.current.occupation || (affiliations[0] ?? ""),
      company: personMore.current.company || (affiliations[1] ?? ""),
    });
  }, [helperName, helperCity, affiliations]);
  const confirmedFacts: ConfirmedFacts = {
    ...(factBasics.name ? { name: factBasics.name } : {}),
    ...(factBasics.websiteUrl ? { domain: websiteHost(factBasics.websiteUrl) } : {}),
    // The business type sharpens the later enrichment search ("name" + type + city).
    ...(factBasics.category ? { category: factBasics.category } : {}),
    // Not confirmed: our best finding, used only to build that search when nothing is confirmed yet.
    ...bestFindingHints(items),
    ...(factBasics.facts.find((f) => f.field === "address")?.value
      ? { location: factBasics.facts.find((f) => f.field === "address")?.value }
      : {}),
    // What anchors a weak name: the confirmed accounts' exact handles, and their links and websites.
    ...nameAnchors(factBasics.accounts, personAnchors),
    ...(fullName ? { full_name: fullName } : {}),
  };
  // A confirmed name / location wakes the steps waiting on it (a new round carrying only those facts).
  const woken = work.woken;
  const wokenKey = JSON.stringify(woken);
  const runWoken = useEffectEvent(() => {
    const next = autoWork(items, decisions, restoredDecisions.current, explored.current, wokenSent.current, person).woken;
    if (next.name) wokenSent.current.add(`name:${next.name}`);
    if (next.location) wokenSent.current.add(`location:${next.location}`);
    void startRound({ website: "", socials: [] }, next);
  });
  useEffect(() => {
    if ((created && !validating) || wokenKey === "{}") return;
    const timer = setTimeout(runWoken, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [wokenKey, created, validating]);

  // A typed full name re-runs the name searches with it (the woken name steps read `confirmed.full_name`).
  const runFullName = useEffectEvent(() => {
    if (fullName && factBasics.name) void startRound({ website: "", socials: [] }, { name: factBasics.name });
  });
  useEffect(() => {
    if (fullName) runFullName();
  }, [fullName]);
  const askFullName = Boolean(nameStrength?.fullNameAsked) && !fullName && !fullNameSkipped && !created;

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

  const applyAnswer = (key: string, decision: Decision) => {
    delete restoredDecisions.current[key]; // the person's own answer now: it counts again
    setDecisions((d) => applyDecision(d, items, key, decision));
  };
  /** An answer that started follow-up searches or AI work: clearing or flipping it restarts that work, so it asks first. */
  const [restartAsk, setRestartAsk] = useState<{ key: string; decision: Decision } | null>(null);
  const decide = (key: string, decision: Decision) => {
    const cur = decisions[key];
    const keptClass = (d: Decision) => (d === "no" ? "no" : "yes");
    if (cur && explored.current.has(key) && (cur === decision || keptClass(cur) !== keptClass(decision))) {
      setRestartAsk({ key, decision });
      return;
    }
    applyAnswer(key, decision);
  };
  /** The restart dialog's four choices; any change re-opens the key for exploring. */
  const answerRestart = (choice: "yes" | "no" | "other" | "none") => {
    const ask = restartAsk;
    setRestartAsk(null);
    if (!ask) return;
    const cur = decisions[ask.key];
    explored.current.delete(ask.key);
    if (cur) applyAnswer(ask.key, cur); // clear first (the same answer again)
    if (choice === "yes") applyAnswer(ask.key, "yes");
    else if (choice === "no") applyAnswer(ask.key, "no");
    else if (choice === "other") skip(ask.key, true);
  };

  /** Person name mode: the anchor round ("Which of these is you?"), with the typed name and city already woken. */
  const findPerson = (name: string, city: string, more: PersonMore = { occupation: "", company: "", extra: "" }) => {
    resetAll();
    personTyped.current = { name, city };
    personMore.current = more;
    const answers = [customItem("name", name), ...(city ? [customItem("address", city)] : [])];
    addCustom(answers);
    // The anchor round carries the woken name and city itself; the wake effect must not send them again.
    wokenSent.current.add(`name:${name}`);
    if (city) wokenSent.current.add(`location:${city}`);
    void startRound({ website: "", socials: [] }, { name, ...(city ? { location: city } : {}) }, false, true);
  };

  /** "Which of these is you?": several can be "me"; "Namesake" is a not-me kept with its own relation. */
  const answerAnchor = (item: EvidenceItem, answer: AnchorAnswer | null) => {
    setNamesakes((cur) => {
      const next = new Set(cur);
      if (answer === "namesake") next.add(item.key);
      else next.delete(item.key);
      return next;
    });
    setDecisions((d) => {
      const { [item.key]: _drop, ...rest } = d;
      if (answer === null) return rest;
      return { ...rest, [item.key]: answer === "me" ? "yes" : "no" };
    });
  };

  // Smart Add helpers (focused-session windows): they search with what this round knows, and their
  // "This is me / Not me / Namesake" answers land here exactly like an anchor card's.
  const applyHelperAnswer = (item: EvidenceItem, answer: AnchorAnswer | null) => {
    setItems((cur) => mergeEvidence(cur, [item]));
    answerAnchor(item, answer);
  };
  const helperAnswer = useEffectEvent(applyHelperAnswer);
  useEffect(() => onHelperAnswer((c, a) => helperAnswer(candidateItem(c), a)), []);

  /** A job, company or major affiliation also grounds a person (Part 9); it starts the grounded round. */
  const addAffiliation = (text: string) => setAffiliations((cur) => (cur.includes(text) ? cur : [...cur, text]));
  const runAffiliation = useEffectEvent(() => void startRound({ website: "", socials: [] }));
  useEffect(() => {
    if (!affiliations.length || groundedSent.current || created) return;
    const timer = setTimeout(runAffiliation, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [affiliations, created]);

  /** Find-you "yes": an account or the person's own site lands as a confirmed finding (the next round grounds on
   *  it); an employer bio page or licence record is a page anchor; any other page only teaches clues. */
  const confirmFound = (c: HarderCandidate) => {
    if (c.bucket === "social" || c.bucket === "directory" || c.anchor_kind === "personal_site") {
      applyHelperAnswer(candidateItem(c), "me");
      return;
    }
    if (c.firm) setPageAnchors((cur) => (cur.includes(c.url) ? cur : [...cur, c.url]));
  };
  const logFind = (entry: FindLogEntry) => setFindLog((cur) => [...cur, entry]);
  const runPageAnchor = useEffectEvent(() => void startRound({ website: "", socials: [] }));
  useEffect(() => {
    if (!pageAnchors.length || groundedSent.current || created) return;
    const timer = setTimeout(runPageAnchor, CONFIRM_BATCH_MS);
    return () => clearTimeout(timer);
  }, [pageAnchors, created]);
  const onPath = (runId: string, p: RoundPath) => {
    setPathByRun((cur) => (JSON.stringify(cur[runId]) === JSON.stringify(p) ? cur : { ...cur, [runId]: p }));
  };

  /** A profile link typed on the anchor cards: confirmed like any account the person adds. */
  const addAnchorLink = async (text: string) => {
    // A Mastodon account on its own server looks like a website until the host is checked (MKT-102).
    await learnFediverseFromText(text, { onLearned: teachFediverseHost });
    const parsed = resolveAccountInput({ text });
    if (parsed.status === "ok") addCustom(customItem("social", parsed.url, { platform: parsed.platform, handle: parsed.handle, url: parsed.url }));
    else addCustom(customItem("website", text));
  };

  /** The header label's change menu: the tab is the answer; this only corrects it. */
  const answerKind = (answer: "person" | "business" | "both") => {
    kindLabel.choose();
    setKindBoth(answer === "both");
    setPerson(answer === "person" || answer === "both");
  };

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

  const skip = (key: string, on: boolean) =>
    setSkipped((cur) => {
      if (cur.has(key) === on) return cur;
      const next = new Set(cur);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  /** "Other → Tagline or slogan": the name becomes the About tagline and leaves the name list; Undo puts it back. */
  const moveToTagline = (name: EvidenceItem, on: boolean) => {
    if (on) {
      const tagline: EvidenceItem = { ...customItem("tagline", name.value), source: name.source, confidence: name.confidence };
      addCustom(tagline);
      setTaglines((cur) => ({ ...cur, [name.key]: tagline }));
      return;
    }
    const moved = taglines[name.key];
    setTaglines(({ [name.key]: _drop, ...rest }) => rest);
    if (!moved) return;
    setItems((cur) => {
      const next = new Map(cur);
      next.delete(moved.key);
      return next;
    });
    setDecisions(({ [moved.key]: _drop, ...rest }) => rest);
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
  // A round that never started says why (MKT-094): the screen names it beside its retry.
  const startFailure = rounds.find((r) => r.error)?.error ?? null;
  // A step that already said it could not open the site is not still "reading" it.
  const progressLines = roundViews
    .flatMap((v) => v?.steps ?? [])
    .filter((s) => s.phase === "running" && s.progress && !stepCouldNotRead(s))
    .map((s) => s.progress as string);
  // The typed site refused or timed out: the screen says so (its rows came from the web instead).
  const siteUnread = rounds.map((r, i) => siteReadFailure(roundViews[i], r.seeds.website)).find(Boolean) ?? null;
  // The facts agent failed and no round brought a fact: say so, never carry on as if nothing were missing (MKT-061).
  const factsMissing = facts.length === 0 && roundViews.some((v) => v?.factsFailed);
  // Every paid step of every round (anchor searches and profile lookups included) and the setup run: never
  // "Free so far" after a paid lookup (PEOPLE-AND-CREATORS §10).
  const costUsd =
    roundViews.reduce((sum, v) => sum + (v?.spendUsd ?? v?.steps.reduce((s, x) => s + x.costUsd, 0) ?? 0), 0) +
    (setupView?.spendUsd ?? 0);
  // A later round's judgment of a finding wins over an earlier one (it saw more).
  const suggestions: Record<string, WeThinkSuggestion> = Object.assign({}, ...rounds.map((r) => (r.runId ? suggestionsByRun[r.runId] : undefined) ?? {}));
  // Staff profiles' names, photos and bios never reach a business's own slots (they are key people).
  const visible = withSuggestions(
    withoutRepeatedText(
      withoutNonContactEmails(orderedEvidence(withoutStaffFacts(withoutOwnAccountRows(items.values(), decisions), person)), (host) =>
        categoriesFor(host, liveKnownDomainRules() ?? []).includes("non_contact_mail"),
      ),
      decisions,
    ),
    suggestions,
  );
  // What is known about the person ranks every candidate card (typed facts, confirmed sites): anchors over counts.
  const knownAnchors: PersonAnchors = {
    city: personTyped.current?.city ?? null,
    occupation: personMore.current.occupation || null,
    company: personMore.current.company || null,
    foundHosts: [...personAnchors, ...pageAnchors],
  };
  /** One rung down the find-you ladder (easy → harder → hard → close to impossible), asked or automatic. */
  const stepDown = (why: string) => {
    const from = findYou ? findPath : (personPath?.runs_as ?? "person_easy");
    const next = nextPersonRung(from);
    if (!next) return;
    setEscalatedPath(next);
    logFind({ at: Date.now(), kind: "escalation", text: `Dig deeper: ${from} → ${next} (${why})` });
  };
  // Automatic escalation: every candidate on the easy screen marked Not me / Namesake, or none found once the round
  // settled, steps down without the person asking (the harder stages escalate themselves the same way).
  const easyAnchors = person && personTyped.current && !findYou && !personAnchors.length ? anchorItems(visible) : null;
  const easyVerdict = easyAnchors && personPath?.subject === "person" && !working
    ? autoEscalation(personPath.runs_as, easyAnchors.map((i) => (namesakes.has(i.key) ? "namesake" : decisions[i.key] === "no" ? "not_me" : decisions[i.key] ? "me" : null)), easyAnchors.length)
    : null;
  const easyVerdictKey = easyVerdict ? `${easyVerdict.from}>${easyVerdict.to}` : "";
  const runEasyEscalation = useEffectEvent(() => {
    if (easyVerdict) stepDown(easyVerdict.reason);
  });
  useEffect(() => {
    if (easyVerdictKey) runEasyEscalation();
  }, [easyVerdictKey]);
  const basics = confirmedBasics(items, decisions, person);
  // The landing card shows the best found name and logo until the person confirms their own, so
  // what the stage found has a real place to land (it is never created from these: Create reads basics).
  const foundLogo = stageLogo(withoutStaffFacts(items.values(), person));
  // The card's picture falls back through every logo it may show: the confirmed main one, then the site's own
  // logos, then profile photos — never one the person turned down or one the page already found broken.
  const cardPictures = [
    ...new Set(
      [
        basics.images.find((i) => i.primary)?.url,
        ...stageLogos(withoutStaffFacts(items.values(), person))
          .filter((i) => decisions[i.key] !== "no" && !brokenKeys.current.has(i.key))
          .map((i) => i.image_url),
      ].filter((u): u is string => Boolean(u)),
    ),
  ];
  // Placeholders wait on the ONE job that fills them, never on "the round is busy": a step that can bring a
  // picture, and the homepage capture (for a site the person has not turned down).
  const findingPictures =
    roundViews.some((v) => v?.imaging) || rounds.some((r) => !r.error && (!r.runId || !views[r.runId]));
  const shotCapturing = roundViews.some((v) => v?.shooting);
  const shotHost = screenshots?.pageUrl ? websiteHost(screenshots.pageUrl) : null;
  const shotSite = !visible.some((i) => i.field === "website" && decisions[i.key] === "no" && (!shotHost || websiteHost(i.value) === shotHost));
  // The compare bar shows only when the compare window has a real open comparison (2+ unsettled candidates in one
  // slot) — the same list the window renders, so it can never open on "Nothing left to compare".
  const compareState = {
    decisions,
    relations: Object.fromEntries(Object.entries(relations).map(([k, r]) => [k, r.relation])),
    skipped,
    person,
    ownSites: [typedWebsite, ...rounds.map((r) => r.seeds.website)].filter((u): u is string => Boolean(u)),
  };
  const openComparisons = compareSlots(visible, compareState).filter((sl) => !sl.candidates.every((c) => isAnswered(c, compareState))).length;
  const foundName = stageName(withoutStaffFacts(items.values(), person));
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
  const postsPoints = postsPerAccount ? spend.postsTotalText(trackedAccounts.map((a) => a.platform ?? ""), postsPerAccount) : null;
  const situation = situationOf(visible, rounds.length > 0 && !working);
  // One vocabulary for every found thing (web.brand_relation_kind) — the web step answers from it too.
  const { kinds: relationKinds } = useRelationKinds(relate);
  const webCtx = suggestContext(
    // The person's own website: confirmed, or typed / started from (the hero's first step).
    [basics.websiteUrl, ...basics.otherWebsites, typedWebsite || null, ...rounds.map((r) => r.seeds.website || null)],
    basics.accounts.map((a) => a.url ?? a.value),
    basics.name ?? foundName?.value ?? null,
    {
      accounts: visible.filter((i) => i.field === "social").map((i) => i.url),
      place: confirmedFacts.location ?? factBasics.facts.find((f) => f.field === "address")?.value ?? null,
      handles: [...basics.accounts.map((a) => a.handle ?? null), ...visible.filter((i) => i.field === "social").map((i) => i.handle)],
    },
  );
  const webItems = visible.filter((i) => i.field === "listing" || i.field === "mention" || i.field === "web_page");
  const webPersonRows = webItems.flatMap((item) => {
    const k = relationKinds.find((x) => x.key === webChoices[item.key]?.kind);
    return k && (k.routesTo === "owns" || k.routesTo === "key_person")
      ? [{ item, relation: k.label, guess: personNameOnPage({ title: item.label, snippet: item.snippet }, webCtx.name) }]
      : [];
  });
  const webPersonName = (key: string): string => {
    const row = webPersonRows.find((r) => r.item.key === key);
    return (webPersonNames[key] ?? row?.guess ?? "").trim();
  };
  const webSuggestions = Object.fromEntries(webItems.map((i) => [i.key, suggestKind(i, relationKinds, webCtx)]));
  useEffect(() => {
    if (!builder.isActive) return;
    // The publisher is admin-only code: it loads on first use, never for anyone else.
    const state = {
      inputs: { website: websiteText, social: socialText, platform: picked, person },
      rounds,
      setup: setupRunId ? { runId: setupRunId } : null,
      items: [...items.values()],
      facts,
      validating,
      decisions,
      relations,
      web: { choices: webChoices, suggestions: webSuggestions, context: webCtx },
      basics,
      created,
      provisionPoint: BRAND_INTAKE_POINT,
      // Enrich (admin view): the seeded known-facts set and the diff against the brand.
      enrich: enrich
        ? {
            brandId: enrich.snapshot.brand.id,
            organizationId: enrich.snapshot.brand.organization_id,
            known: enrich.known.map((f) => ({ id: f.id, group: f.group, label: f.label, value: f.value, seeded: enrich.checked.has(f.id) })),
            seed: { decisions: enrich.seed.decisions, known: enrich.seed.known, excludeKeys: enrich.seed.excludeKeys, exclusions: enrich.seed.exclusions },
            diff: computeEnrichDiff({ known: enrich.known, items, decisions, broken: brokenKeys.current, seeded: enrich.checked }).map((c) => ({
              id: c.id,
              kind: c.kind,
              label: c.label,
              current: c.current?.value ?? null,
              next: c.next ? (c.next.image_url ?? c.next.value) : null,
              defaultChoice: c.defaultChoice,
            })),
          }
        : null,
      findYou: findYou || findLog.length
        ? { path: personPath, findPath, history: pathHistory, log: findLog, pageAnchors, anchors: personAnchors, sweep: sweepFeed.current.sweep, focus: sweepFeed.current.focus }
        : null,
    };
    void import("./builderFeed").then((m) => m.publishSmartAddFeed(builder.publish, state));
  });
  const canCreate = Boolean(basics.name) && !creating && !created;

  // ── create ──────────────────────────────────────────────────────────────

  const create = async () => {
    if (!basics.name) return;
    // A brand they already have, found by the same site, account or name: ask once, then it is their call.
    const gate = await gateCreate({ probe: confirmedProbe, find: findMatchingBrands, ask: confirm, answered: separateRef.current });
    if (!gate.proceed) return;
    if (gate.answered !== separateRef.current) {
      separateRef.current = gate.answered;
      setSeparateIds(gate.answered);
    }
    setCreating(true);
    setCreateError(null);
    try {
      const organizationId = await ensureOrgId(null);
      // "Related" candidates the person answered (only ones still unanswered elsewhere count).
      const related = Object.values(relations).filter((r) => !decisions[r.candidate.anchor.key]);
      // Web results answered founder / key person route to people exactly like an account does.
      const kindOf = (key: string) => relationKinds.find((k) => k.key === webChoices[key]?.kind);
      const unnamedPeople = new Set<string>();
      for (const i of webItems) {
        const k = kindOf(i.key);
        if (k && (k.routesTo === "owns" || k.routesTo === "key_person")) {
          // Asked, not read off the title; a result left without a name stays a plain found page below.
          const personName = webPersonName(i.key);
          if (!personName) {
            unnamedPeople.add(i.key);
            continue;
          }
          related.push({ candidate: { ...webCandidate(i), name: personName }, relation: { key: k.key, label: k.label, routesTo: k.routesTo } });
        }
      }
      // Their link-in-bio pages (Linktree, Stan, …) are theirs without asking: kept as "Link-in-bio page".
      const linkPageKind = relationKinds.find((k) => k.key === "link_in_bio_page");
      const ownHandles = [...items.values()].filter((i) => i.field === "social" && i.handle && decisions[i.key] !== "no").map((i) => i.handle as string);
      for (const page of linkPages(items.values(), ownHandles)) {
        if (!page.theirs || decisions[page.key] || relations[page.key]) continue;
        related.push({
          candidate: webCandidate(page.item),
          relation: { key: "link_in_bio_page", label: linkPageKind?.label ?? "Link-in-bio page", routesTo: null },
        });
      }
      const competitors = [
        ...relatedCompetitors(related),
        ...webItems
          .filter((i) => kindOf(i.key)?.routesTo === "competitor")
          .map((i) => ({ name: siteNameOf({ title: i.label, host: websiteHost(i.url ?? i.value) }), domain: websiteHost(i.url ?? i.value) })),
      ];
      // A web result answered "Ours" that is a site of its own becomes one of the brand's websites.
      const webSites = webItems
        .filter((i) => kindOf(i.key)?.routesTo === "brand_property")
        .map(webSiteRoot)
        .filter((u): u is string => Boolean(u) && !webCtx.ourHosts.includes(websiteHost(u as string)));
      // Every fact the facts agent found that the person did not say No to is kept (keptFacts.ts); the basics
      // Create had no confirmed value for are filled from it, and the gate later asks only about those.
      const factPlan = planKeptFacts(facts, (f) => {
        const k = factSlotKey(f);
        return k ? decisions[k] : undefined;
      }, { description: basics.description, industry: basics.category, tagline: basics.tagline, brandName: basics.name });
      const brand = await createBrand({
        organizationId,
        name: basics.name,
        kind: person ? "person" : "company",
        industry: basics.category ?? factPlan.industry,
        description: basics.description ?? factPlan.description,
        // What the person settled here, so the setup gate never asks again; and where each filled basic came from.
        metadata: {
          smart_add: {
            confirmed: {
              name: true,
              ...(basics.description ? { what_you_do: true } : {}),
              ...(basics.aliases.length ? { aliases: true } : {}),
              ...(basics.category ? { industry: true } : {}),
            },
            basics_sources: factPlan.basicsSources,
            facts_kept: factPlan.rows.length,
            facts_runs: [...new Set(facts.map((f) => f.run_id).filter((id): id is string => Boolean(id)))],
          },
        },
        websiteUrl: basics.websiteUrl,
        // The confirmed logo is saved by the setup run as a durable file, never an expiring link.
        logoUrl: null,
        faviconUrl: null,
        ogImageUrl: null,
        notes: null,
        status: "active",
        // Aliases live where every brand reader looks for them (web.brand.profile.brand_aliases).
        // Aliases and expertise live where every brand reader looks for them (web.brand.profile).
        // The person's answers win; the kept facts fill what they left open.
        profile: {
          ...factPlan.profile,
          ...(basics.aliases.length || factPlan.profile.brand_aliases
            ? { brand_aliases: [...new Set([...basics.aliases, ...(factPlan.profile.brand_aliases ?? [])])] }
            : {}),
          ...(basics.expertise.length ? { expertise_areas: basics.expertise } : {}),
          ...(competitors.length ? { competitors } : {}),
        },
      });
      const problems: string[] = [];
      const accounts: { handle_or_url: string; platform: string; property_id: string }[] = [];
      for (const item of basics.accounts) {
        try {
          const row = await createProperty({
            organizationId,
            brandId: brand.id,
            // A profile site (GitHub, Substack…) has no property kind of its own: it is kept as `other` with its address.
            kind: toPropertyKind(item.platform ?? "website") as Parameters<typeof createProperty>[0]["kind"],
            url: item.url,
            handle: item.handle,
            displayName: item.label,
            status: "active",
          });
          // Only a platform the server can look up is tracked; a profile site stays a property.
          if (item.platform && TRACKABLE_PLATFORMS.has(item.platform)) accounts.push({ handle_or_url: item.url ?? item.value, platform: item.platform, property_id: row.id });
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
          // Never reassign a site another brand already tracks: say so and give this brand its own
          // website row; moving it is the person's explicit choice.
          const claim = await claimSite(liveSiteClaimDeps, {
            organizationId,
            brandId: brand.id,
            rootUrl: parsedUrl.toString(),
            host: parsedUrl.hostname.toLowerCase(),
          });
          if (claim.kind === "tracked-elsewhere") problems.push(claim.note);
          else siteIds.push(claim.site.id);
        } catch (error) {
          problems.push(`${websiteHost(url)}: ${extractErrorMessage(error)}`);
        }
      }
      // Every site is crawled by the setup run on the server (brand.setup.crawl_sites): it survives a
      // closed tab and shows on the run page with each crawl session.
      // Nothing is lost: every finding the person did not answer is kept as a candidate in the
      // brand's discovery inbox (web.discovered_item); only "Not us" is left out.
      // Related items keep their relationship (and land in their home: people, competitors).
      const relatedSaved = await routeRelated(organizationId, brand.id, related, decisions);
      problems.push(...relatedSaved.problems);
      // Every answered web result keeps its answer, sentiment and where it was found; "Not us" (here and
      // in the compare rows) also lands on the brand's exclusion list.
      const webSaved = await routeWebChoices(organizationId, brand.id, webItems, webChoices, relationKinds, webSuggestions, unnamedPeople);
      problems.push(...webSaved.problems);
      recordWebAnswers(organizationId, webItems, webChoices, relationKinds);
      for (const k of webSaved.keys) relatedSaved.keys.add(k);
      problems.push(...(await excludeNotUs(organizationId, brand.id, [...items.values()], decisions, namesakes)));
      problems.push(
        ...(await saveCandidates(
          organizationId,
          brand.id,
          withoutStaffFacts(items.values(), person).filter((i) => !decisions[i.key] && !relatedSaved.keys.has(i.key) && !brokenKeys.current.has(i.key)),
        )),
      );
      problems.push(...(await saveFacts(organizationId, brand.id, basics)));
      // Create's own contact facts above are never written twice.
      const written = new Set([
        ...basics.facts.map((f) => `${f.field}|${f.value.trim().toLowerCase()}`),
        ...(basics.tagline ? [`tagline|${basics.tagline.trim().toLowerCase()}`] : []),
      ]);
      problems.push(...(await saveKeptFacts(organizationId, brand.id, factPlan, written)).problems);
      setSaveNotes(problems);
      setCreated(brand);
      // The core is settled: shift to the focus queue for everything else.
      const settled = coreSettled(basics, person);
      if (settled) setValidateOrg(organizationId);
      onCreated?.(brand);
      if (settled) onValidating?.(brand);
      // Nothing explicitly kept: the logo the card shows (the stage's best found one) is saved as the
      // primary, so a brand never lands on a placeholder while candidates exist.
      // The homepage pictured (desktop + mobile) lands in the brand's library beside the logo: more than a logo.
      const images = [
        ...(basics.images.length ? basics.images : cardBasics.images),
        ...homepageImages(screenshots),
      ];
      if (images.length || accounts.length || siteIds.length) {
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
                images,
                accounts,
                sites: siteIds,
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
      // On the validation page the inputs are captured (Builder panel) but no window covers the queue.
      await showProvision(brand, organizationId, "created", !settled);
    } catch (error) {
      setCreateError(extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  // PROVISION POINT — brand_intake.smart_add_create. This is where the brand-intake analysis
  // would run. No agent runs (Arman, 2026-10-12): the exact values available here are captured
  // and shown in the Provision window. Spec: smart-add-brand/PROVISION.md.
  const provisionAutoOpened = useRef(false);
  const showProvision = async (
    brand: MarketingBrand,
    organizationId: string,
    trigger: "created" | "manual",
    open = true,
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
      if (open) {
        // MKT-133: Create opens this window by itself, so it follows the Watch AI rules (MKT-076 / MKT-104):
        // once per page load (a close sticks), only when a gutter beside the working column holds it, never
        // over the cards. A person's own press on "Brand analysis inputs" ("manual") always opens it.
        if (trigger === "manual") {
          openProvision(snapshot.id, `Brand analysis inputs: ${brand.name}`);
        } else if (!provisionAutoOpened.current && autoOpenHasRoom()) {
          provisionAutoOpened.current = true;
          markAutoOpened("provisionWindow", DEFAULT_INSTANCE_ID);
          openProvision(snapshot.id, `Brand analysis inputs: ${brand.name}`);
        }
      }
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
  // The structured page's two fields keep the address current (the intake stage writes its own, SmartAddHero).
  useEffect(() => {
    if (!structured) return;
    const timer = setTimeout(
      () => writeAddress({ website: websiteText.trim() || null, social: socialText.trim() || null, platform: picked }),
      SMART_ADD_ADDRESS_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [structured, websiteText, socialText, picked]);
  // Something to show = a real finding or an answer the person gave (the quick questions);
  // never the address they typed echoed back.
  const hasFindings = [...items.values()].some((i) => i.source.where !== "the address itself");
  const firstFindingAt = useRef<number | null>(null);
  // The hold clock starts when the stage has something to SHOW (a logo, a name, an account) — a
  // phone number read off the page counts as a finding but never appears on the stage.
  const showable =
    Boolean(foundLogo || foundName) ||
    [...items.values()].some((i) => i.field === "social" && i.source.kind !== "typed" && i.source.where !== "the address itself");
  // ── the entry's honest answer (entryOutcome.ts) ────────────────────────────
  // The first typed round decides whether what was typed exists. A failed entry never morphs into a findings page
  // and never offers Create: the stage says what happened and offers Edit / Try another / Search by name.
  // Proof the entry exists: something a step READ. The facts agent's words are not proof (it once made a brand name
  // out of a handle that does not exist).
  const foundReal = [...items.values()].some(
    (i) => i.source.where !== "the address itself" && i.source.kind !== "typed" && i.source.node !== "facts",
  );
  // The entry's answer and whether the session could be read back (entryOutcome.ts › sessionEntry).
  const judged = sessionEntry(
    rounds.map((r) => ({ seeds: r.seeds, view: r.runId ? views[r.runId] : undefined })),
    foundReal,
  );
  const entryOutcome = judged.outcome;
  const entryFailed = !enrich && isFailedEntry(entryOutcome);
  // The run could not be read back (refused, or an empty replay): "Couldn't load this run", never "doesn't exist".
  const runUnreadable = !enrich && !entryFailed && judged.unreadable;
  // Quiet too long while a round runs: the stage says so (never an endless spinner).
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    setQuiet(false);
    if (!working || entryFailed || runUnreadable) return;
    const timer = setTimeout(() => setQuiet(true), Math.max(stallMs - (Date.now() - lastEventAt), 0));
    return () => clearTimeout(timer);
  }, [working, entryFailed, runUnreadable, lastEventAt, stallMs]);
  // A late not-found answer takes the findings page back down.
  // MKT-134: never once the brand exists — the validation page is mounted by `structured`, and taking it down
  // drops the Answered tray's state (5 answered became 1).
  useEffect(() => {
    if (entryFailed && !created) setStructured(false);
  }, [entryFailed, created]);

  useEffect(() => {
    if (structured || !hasFindings || entryFailed) return;
    if (rounds.length && working && !showable) return;
    firstFindingAt.current ??= Date.now();
    const held = Date.now() - firstFindingAt.current;
    const wait = rounds.length ? Math.max(STAGE_HOLD_MS - held, 0) : STAGE_ANSWER_MS;
    const timer = setTimeout(() => setStructured(true), wait);
    return () => clearTimeout(timer);
  }, [hasFindings, structured, rounds.length, working, showable, entryFailed]);

  // ── back, edit, start over ─────────────────────────────────────────────────
  // Every running round is stopped (no more spend), the session resets, and the address forgets the runs.
  const stopRuns = () => {
    for (const r of rounds) {
      const status = r.runId ? views[r.runId]?.status : null;
      if (r.runId && !["completed", "failed", "errored", "cancelled", "stopped", "refused"].includes(status ?? "")) {
        void runControls.cancel(r.runId);
      }
    }
  };
  const [heroKey, setHeroKey] = useState(0);
  const [fresh, setFresh] = useState(false);
  /**
   * Restart: "edit" and "retry" keep what was typed; "over" clears it and the address too. Asks first (the
   * canonical confirm) only when there is something to lose: findings or answers. False = the person kept going.
   */
  const restart = async (how: "edit" | "retry" | "over"): Promise<boolean> => {
    const answers = Object.keys(decisions).length;
    if (!entryFailed && (hasFindings || answers) && how !== "retry") {
      const spent = costUsd > 0 ? ` and ${format(costUsd)} of lookups` : "";
      const ok = await confirm({
        title: how === "over" ? "Start over?" : "Edit and search again?",
        description: `${answers ? `${answers} answers` : "What we found"}${spent} will be cleared.`,
        confirmLabel: how === "over" ? "Start over" : "Edit",
        variant: "destructive",
      });
      if (!ok) return false;
    }
    stopRuns();
    resetAll();
    setStructured(false);
    firstFindingAt.current = null;
    setWebsiteText("");
    setSocialText("");
    setTypedTick((t) => t + 1);
    wroteRuns.current = false;
    if (how === "over") {
      setPicked(null);
      url?.write({ website: null, social: null, platform: null, name: null, city: null, occupation: null, company: null, runs: [] });
      url?.setVia(null);
      setFresh(true);
      setHeroKey((k) => k + 1);
    }
    return true;
  };
  // Browser Back from a search returns to the entry (the search pushed one history entry): the address lost its
  // runs while this page still holds them, so the search is stopped and the fields come back to edit.
  const addressRuns = url?.address.runs.length ?? 0;
  const backToEntry = useEffectEvent(() => {
    if (!wroteRuns.current || addressRuns > 0 || !rounds.length || created) return;
    stopRuns();
    resetAll();
    setStructured(false);
    firstFindingAt.current = null;
    setWebsiteText("");
    setSocialText("");
    setTypedTick((t) => t + 1);
    wroteRuns.current = false;
    setFresh(true);
    setHeroKey((k) => k + 1);
  });
  useEffect(() => backToEntry(), [addressRuns]);
  useLayoutEffect(() => {
    if (structured) riseIn(pageRef.current);
  }, [structured]);
  // ── you already have this brand (brandMatch.ts) ──────────────────────────
  // Checked as soon as the entry is typed, before any search is paid for, and again from what the round confirmed.
  // It offers and never blocks: open it, add what is new to it (enrich), or create a separate brand.
  const router = useRouter();
  const [entryProbe, setEntryProbe] = useState<BrandProbe | null>(null);
  const [separateIds, setSeparateIds] = useState<ReadonlySet<string>>(new Set());
  const separateRef = useRef<ReadonlySet<string>>(separateIds);
  const [released, setReleased] = useState(0);
  const checkMatches = !enrich && !person;
  const confirmedProbe: BrandProbe | null =
    checkMatches && structured
      ? {
          domains: [basics.websiteUrl, ...basics.otherWebsites].filter((u): u is string => Boolean(u)).map(websiteHost),
          accounts: basics.accounts.filter((a) => a.handle).map((a) => ({ platform: a.platform ?? null, handle: a.handle as string })),
          name: basics.name,
          place: basics.facts.find((f) => f.field === "address")?.value ?? entryProbe?.place ?? null,
        }
      : null;
  const existing = useExistingBrands(checkMatches ? (confirmedProbe ?? entryProbe) : null);
  const matches = existing.matches.filter((m) => !separateIds.has(m.brand.id));
  const chooseSeparate = () => {
    const next = new Set([...separateRef.current, ...matches.map((m) => m.brand.id)]);
    separateRef.current = next;
    setSeparateIds(next);
    setReleased((n) => n + 1);
  };
  /** Add what is new to an existing brand: the enrich flow, carrying the website and account this session has. */
  const addToExisting = (m: BrandMatch) => {
    const account = basics.accounts.find((a) => a.platform && isSocialPlatform(a.platform));
    // Before any search the answers are only what was typed (the entry's probe); later, what the round confirmed.
    const typed = entryProbe?.accounts.find((a) => a.platform && isSocialPlatform(a.platform));
    const carried =
      account && account.platform && isSocialPlatform(account.platform)
        ? { social: account.url ?? account.value, platform: account.platform }
        : typed && typed.platform && isSocialPlatform(typed.platform)
          ? { social: typed.handle, platform: typed.platform }
          : {};
    stopRuns();
    router.push(smartAddEnrichHref(m.brand.id, { website: basics.websiteUrl ?? (typedWebsite || entryProbe?.domains[0] || undefined), ...carried }));
  };
  /** Before a search starts: wait (a moment) for the check; a match the person has not answered holds the search. */
  const beforeStart = async (typed: Parameters<NonNullable<React.ComponentProps<typeof SmartAddHero>["onBeforeStart"]>>[0]) => {
    if (!checkMatches) return true;
    const probe = probeFromDraft(typed);
    setEntryProbe(probe);
    try {
      const found = await Promise.race([findMatchingBrands(probe), new Promise<BrandMatch[]>((resolve) => setTimeout(() => resolve([]), 3000))]);
      return !found.some((m) => !separateRef.current.has(m.brand.id));
    } catch {
      return true;
    }
  };

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
        r.runId ? (
          <SmartAddRound
            key={r.runId}
            runId={r.runId}
            onEvidence={onEvidence}
            onFacts={(f) => setFacts((cur) => mergeFacts(cur, f.map((x) => (x.run_id ? x : { ...x, run_id: r.runId }))))}
            onSuggestions={(next) =>
              setSuggestionsByRun((cur) => (JSON.stringify(cur[r.runId as string]) === JSON.stringify(next) ? cur : { ...cur, [r.runId as string]: next }))
            }
            onSignals={setPersonSignals}
            onEntityKind={kindLabel.suggest}
            onKeyPeople={setKeyPeople}
            onPath={(p) => onPath(r.runId as string, p)}
            onNameStrength={setNameStrength}
            onScreenshots={setScreenshots}
            onView={onView}
          />
        ) : null,
      )}
    </>
  );
  // Enrich finish: nothing is written until the person confirms the Changes review.
  const enrichDiff = enrich ? computeEnrichDiff({ known: enrich.known, items, decisions, broken: brokenKeys.current, seeded: enrich.checked }) : null;
  if (enrich && reviewing && enrichDiff) {
    return (
      <>
        <ChangesReview
          snapshot={enrich.snapshot}
          changes={enrichDiff}
          kinds={relationKinds}
          onBack={() => setReviewing(false)}
          onBrand={() => onCreated?.(enrich.snapshot.brand)}
        />
        {listeners}
      </>
    );
  }
  // The validation page outranks the entry: nothing pulls it down while its answers are on screen (MKT-134).
  if (!structured && !(created && validateOrg)) {
    return (
      <>
        <SmartAddHero
          key={heroKey}
          person={person}
          onPerson={setPerson}
          onFindPerson={findPerson}
          onEmail={(email, startNow) => {
            emailPending.current = email;
            if (startNow) void startRound({ website: "", socials: [] }, {}, true);
          }}
          initial={url ? (fresh ? url.address.prefill : (resume?.address.prefill ?? url.address.prefill)) : undefined}
          via={url ? url.address.viaParam : undefined}
          initialVia={url?.address.via ?? null}
          onVia={url?.setVia}
          onDraft={(draft) => {
            url?.write(draft);
            if (checkMatches) setEntryProbe(probeFromDraft(draft));
          }}
          notice={<ExistingBrandNotice placement="below" matches={matches} error={existing.error} onAddTo={addToExisting} onSeparate={chooseSeparate} />}
          onBeforeStart={beforeStart}
          released={released}
          autoStart={Boolean(url?.autoStart) && !fresh}
          resumed={Boolean(resume) && !fresh}
          outcome={entryFailed ? entryOutcome : null}
          unreadable={runUnreadable}
          slow={quiet && working}
          loadingSession={Boolean(resume) && !fresh && (!showable || rounds.some((r) => r.runId && !views[r.runId]))}
          onRestart={restart}
          onStarted={url?.markSearch}
          onWebsite={setWebsiteText}
          onSocial={setSocialText}
          onPick={setPicked}
          working={working}
          views={roundViews.filter((v): v is RoundView => Boolean(v))}
          items={visible}
          nothingFound={nothingFound}
          failed={failedRound}
          failedReason={startFailure}
          onAdd={addCustom}
        />
        {listeners}
      </>
    );
  }
  if (created && validateOrg) {
    return (
      <>
        <SmartAddValidate
          brand={created}
          organizationId={validateOrg}
          items={visible}
          facts={facts}
          decisions={decisions}
          webChoices={webChoices}
          kinds={relationKinds}
          ctx={webCtx}
          broken={brokenKeys.current}
          working={working}
          onDecide={(key, d) =>
            setDecisions((cur) => {
              if (!d) {
                const { [key]: _drop, ...rest } = cur;
                return rest;
              }
              return cur[key] === d ? cur : applyDecision(cur, items, key, d);
            })
          }
          publish={builder.publish}
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
    <div className="relative px-4 pt-[calc(var(--shell-header-h)+1rem)]" data-smart-add-stage="structured">
    <div ref={pageRef} className="mx-auto flex w-full max-w-3xl flex-col gap-3" data-testid="smart-add-brand">
      <div className="flex items-center justify-between gap-2">
      <SegmentedControl
        aria-label="Brand kind"
        value={person ? "person" : "company"}
        onValueChange={(v) => answerKind(v === "person" ? "person" : "business")}
        data={[
          { value: "company", label: "Company" },
          { value: "person", label: "Person" },
        ]}
      />
      <HelpersMenu person={person} />
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
      <div className="flex h-7 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
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
        {siteUnread ? (
          <span className="flex min-w-0 shrink items-center gap-1 truncate" data-testid="smart-add-site-unread">
            <TriangleAlert className="size-3 shrink-0 text-warning" />
            <span className="truncate">{siteReadLine(siteUnread)}</span>
          </span>
        ) : null}
        {factsMissing ? (
          <span className="flex min-w-0 shrink items-center gap-1 truncate" data-testid="smart-add-facts-failed">
            <TriangleAlert className="size-3 shrink-0 text-warning" />
            <span className="truncate">Couldn&apos;t find the brand&apos;s facts</span>
            <ErrorAlchemyMenu error="The facts step failed in this round" />
          </span>
        ) : null}
        <span className="ml-auto shrink-0 tabular-nums">
          {rounds.length ? (costUsd > 0 ? format(costUsd) : "Free so far") : null}
        </span>
        {rounds.length && !created && url ? (
          <Button variant="quiet" className="shrink-0" onClick={() => void restart("over")} data-testid="smart-add-start-over">
            <RotateCcw className="size-3.5" />
            Start over
          </Button>
        ) : null}
      </div>

      {findYou && personTyped.current ? (
        <PersonHarderStage
          key={`${personTyped.current.name}|${personTyped.current.city}`}
          input={{ ...personTyped.current, ...personMore.current }}
          path={findPath}
          knownUrls={[...personAnchors, ...pageAnchors]}
          grounded={personAnchors.length > 0}
          onConfirm={confirmFound}
          onLog={logFind}
          onEscalate={(why) => stepDown(why ?? "asked on the screen")}
          onProvision={(p) => {
            findYouProvision.current = p;
          }}
          onSweep={(sweep, focus) => {
            sweepFeed.current = { sweep, focus };
          }}
        />
      ) : null}

      {person && personTyped.current ? (
        <AnchorCards
          items={visible}
          decisions={decisions}
          namesakes={namesakes}
          affiliations={affiliations}
          searching={working && !visible.some((i) => i.anchor)}
          onAnswer={answerAnchor}
          onAddLink={addAnchorLink}
          onAddAffiliation={addAffiliation}
          anchors={knownAnchors}
          onDigDeeper={!findYou && !personAnchors.length ? () => stepDown("asked on the screen") : undefined}
        />
      ) : null}

      {/* The brand as it stands: the primary choices, building as the person confirms. */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
      <BrandCard
        basics={cardBasics}
        pictures={cardPictures}
        findingPictures={findingPictures}
        screenshot={person || !shotSite ? null : (screenshots?.desktop?.url ?? null)}
        capturing={!person && shotCapturing && shotSite}
        person={person}
        kind={kindLabel.resolve(personSignals?.verdict === "person" || personSignals?.verdict === "business" ? personSignals.verdict : null, !working)}
        onKind={answerKind}
        location={basics.facts.find((f) => f.field === "address")?.value ?? null}
      />
      </div>

      {situation === "new" ? (
        // Brand-new: little to find, so three quick questions fill the essentials in place.
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border py-3 text-sm" data-testid="smart-add-situation">
          <span className="px-4 font-medium">Not much out there yet — three quick questions</span>
          <CustomAdd field="name" label={person ? "Your name" : "Business name"} placeholder={person ? "Your name" : "Business name"} onAdd={addCustom} />
          <CustomAdd field="description" label="What you do" placeholder="What you do, in a sentence" onAdd={addCustom} />
          <CustomAdd field="address" label="Where you are" placeholder="City or street address" onAdd={addCustom} />
        </div>
      ) : openComparisons > 0 || comparing ? (
        <div className="flex flex-col gap-3" data-testid="smart-add-situation">
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-4 py-2 text-sm">
            <span className="font-medium">{openComparisons === 1 ? "1 possible mix-up" : openComparisons > 1 ? `${openComparisons} possible mix-ups` : "Possible mix-ups"}</span>
            <Button variant="outline" className="ml-auto" onClick={() => setComparing(true)}>
              Compare
            </Button>
          </div>
        </div>
      ) : null}
      {/* Always mounted: the situation banner above changes as findings load; the dialog must not remount. */}
      <CompareDialog
        open={comparing}
        onClose={() => setComparing(false)}
        items={visible}
        decisions={decisions}
        relations={Object.fromEntries(Object.entries(relations).map(([k, r]) => [k, r.relation]))}
        onClaim={claim}
        onRelate={relate}
        skipped={skipped}
        onSkip={skip}
        person={person}
        ownSites={[typedWebsite, ...rounds.map((r) => r.seeds.website)].filter(Boolean)}
      />

      <div
        className="rounded-xl border border-border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
        data-testid="smart-add-results"
      >
        <SmartAddSlots
          personAnchors={person ? knownAnchors : undefined}
          items={visible}
          keyPeople={keyPeople}
          decisions={decisions}
          // MKT-135: once Create has been pressed the slots are final — an empty one says "Nothing found", never "Looking…".
          working={working && !creating && !created}
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
          skipped={skipped}
          onSkip={skip}
          taglines={taglines}
          onTagline={moveToTagline}
          separated={separated}
          onSeparate={separateLogos}
          nameAsk={
            askFullName && nameStrength ? (
              <FullNameAsk shownName={nameStrength.cleaned || nameStrength.name} onFullName={setFullName} onSkip={() => setFullNameSkipped(true)} />
            ) : null
          }
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
        marks={webMarks}
        onMark={(key, mark) => setWebMarks(({ [key]: _drop, ...rest }) => (mark ? { ...rest, [key]: mark } : rest))}
      />
      <WebPersonAsk rows={webPersonRows} names={Object.fromEntries(webPersonRows.map((r) => [r.item.key, webPersonNames[r.item.key] ?? r.guess ?? ""]))} onName={(key, name) => setWebPersonNames((cur) => ({ ...cur, [key]: name }))} />
      <SmartAddBioLinks items={visible} />

      {/* Create: the confirmed basics, one row. */}
      <div className="sticky bottom-3 z-10">
      {created ? null : <ExistingBrandNotice placement="above" matches={matches} error={existing.error} onAddTo={addToExisting} onSeparate={chooseSeparate} />}
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
        {/* Two rows: the brand, then what Create files and what it spends — each fact once, nothing cut off. */}
        <div className="flex min-w-0 flex-1 basis-full items-center gap-2.5 sm:basis-0">
          {basics.logoUrl ? (
            <img src={browserImageUrl(basics.logoUrl)} alt="" className="size-8 shrink-0 rounded object-contain" />
          ) : null}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{basics.name ?? "Confirm a name to create the brand"}</span>
            {basics.name ? (
              // Each fact stays whole: on a phone the facts wrap to a second line instead of being cut off.
              <span className="flex min-w-0 flex-wrap gap-x-1.5 text-xs text-muted-foreground" data-testid="smart-add-posts-preview">
                {[
                  basics.websiteUrl ? websiteHost(basics.websiteUrl) : null,
                  basics.accounts.length ? `${basics.accounts.length} ${basics.accounts.length === 1 ? "account" : "accounts"}` : null,
                  trackedAccounts.length && !created && postsPerAccount ? `${postsPerAccount} posts each` : null,
                  trackedAccounts.length && !created && postsPerAccount ? (postsPoints ?? "points not priced yet") : null,
                ]
                  .filter((f): f is string => Boolean(f))
                  .map((f, n) => (
                    // The site is on the card right above: a phone leaves it out of this line.
                    <span key={f} className={`whitespace-nowrap ${n === 0 && basics.websiteUrl ? "max-sm:hidden" : ""}`}>
                      {n && !(n === 1 && basics.websiteUrl) ? "· " : n ? <span className="max-sm:hidden">· </span> : ""}
                      {f}
                    </span>
                  ))}
              </span>
            ) : null}
          </div>
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
          enrich ? (
            <Button variant="primary" className="max-sm:w-full" onClick={() => setReviewing(true)} data-testid="enrich-review-changes">
              Review changes
            </Button>
          ) : (
            <Button variant="primary" className="max-sm:w-full" disabled={!canCreate} onClick={() => void create()}>
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {coreSettled(basics, person) ? "Create and validate" : "Create brand"}
            </Button>
          )
        )}
      </div>
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

      {setupRunId ? (
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
      <ConfirmDialog
        open={restartAsk !== null}
        onOpenChange={(o) => !o && setRestartAsk(null)}
        title="Restart what this started?"
        description="Changing this answer restarts the searches it triggered."
        confirmHeld
        cancelLabel="Keep it"
        onConfirm={() => undefined}
        content={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => answerRestart("yes")}>Yes</Button>
            <Button variant="outline" onClick={() => answerRestart("no")}>No</Button>
            <Button variant="outline" onClick={() => answerRestart("other")}>Other</Button>
            <Button variant="outline" onClick={() => answerRestart("none")}>No answer</Button>
          </div>
        }
      />
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
  crawl: "Site crawl",
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
          // The validation page answers this row in place (validate/persist.ts).
          evidence_key: i.key,
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

/** The homepage pictures as brand images (kind image, never primary): Create files them in the brand's library. */
function homepageImages(shots: BrandScreenshots | null): LibraryImage[] {
  const out: LibraryImage[] = [];
  if (shots?.desktop) out.push({ url: shots.desktop.url, kind: "image", primary: false, source: "Homepage on a computer" });
  if (shots?.mobile) out.push({ url: shots.mobile.url, kind: "image", primary: false, source: "Homepage on a phone" });
  return out;
}
