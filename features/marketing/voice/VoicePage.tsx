"use client";

/**
 * The Voice page — how one brand or one person writes, measured from their real
 * writing and confirmed by them (brand voice: outside-skill-packs spec T1 + Brief 8).
 *
 * 1. Pick 5–20 samples from Sources.
 * 2. Measure → the triage (sample count, words, AI-edited share, register split,
 *    confidence) and an unconfirmed fingerprint.
 * 3. Confirm the high-risk fields (em dash, openers, closers, signature phrases,
 *    globally banned words they really use, register) → the fingerprint drives
 *    every drafting job's voice check; a brand's voice line becomes its summary.
 * 4. Try a draft → the same enforce loop the drafting jobs run ("Fix voice").
 */

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/navigation/AppLink";
import { Check, Loader2, Search, ShieldAlert, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Button,
  PropertyRow,
  SegmentedControl,
  Select,
} from "@ai-matrx/design-system/controls";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";
import { ProInput } from "@/components/official/ProInput";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { sourceHref } from "@/features/sources/api/sourcesApi";

import {
  MAX_SAMPLES,
  MIN_SAMPLES,
  SAMPLE_KINDS,
  confirmVoice,
  fixVoice,
  listBrandSpokespeople,
  listFingerprints,
  measureVoice,
  refreshLabel,
  searchSources,
  setSpokespersonBrand,
  type ConfirmedVoice,
  type FingerprintRow,
  type SourceOption,
  type VoiceMeasureResult,
  type VoiceProfileScope,
  type VoiceSampleKind,
  type VoiceSurface,
  type VoiceTextOutcome,
} from "./service";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { BrandVoiceSurface } from "./BrandVoiceSurface";
import { SpokespeoplePanel } from "./SpokespeoplePanel";
import { PersonVoiceBar } from "./PersonVoiceBar";
import { MeasuredVoice } from "./MeasuredVoice";
import { brandKindCopy, isPersonBrand } from "@/features/marketing/lib/brand-kind";
import {
  landSocialSample,
  sampleKindForPlatform,
  searchBrandSocialSamples,
  type SocialSampleOption,
} from "./socialSamples";
import { formatCount } from "@ai-matrx/kit/format";

import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
export interface VoicePageProps {
  scope: VoiceProfileScope;
  /** The brand id, or the person's own user id. */
  ownerId: string;
  ownerName: string;
  /** The organization the fingerprint is filed in; a person page resolves it on first action. */
  organizationId: string | null;
  resolveOrganization?: () => Promise<string>;
  /**
   * Rendered inside a host that already owns the scroll and the header offset
   * (the settings core: route, window and phone drawer). Drops the page's own
   * full-height scroll box and shell-header padding.
   */
  embedded?: boolean;
  /** Brand pages: company | person. A person brand's voice is that person's own voice. */
  brandKind?: string | null;
  /** Person brands: the user who is that person, when they said "this is me". */
  personUserId?: string | null;
  /**
   * The Identity voice route only: mount the room's agent surface
   * (`matrx-user/marketing-brand-voice`) over the brand scope. Needs the
   * Identity layout above it, so the settings tab and tests leave it off.
   */
  brandSurface?: boolean;
}

/** What the open confirmation card exposes to the agent surface. */
interface ConfirmBridge {
  snapshot: Record<string, unknown>;
  apply: (value: unknown) => void;
}

type Picked = { source: SourceOption; kind: VoiceSampleKind; social?: SocialSampleOption };

const REGISTERS = ["formal", "professional", "casual-professional", "casual", "irreverent"] as const;
const EM_DASH = ["never", "rare", "habitual"] as const;
const SURFACES: readonly VoiceSurface[] = ["pitch", "reactive", "social", "newsletter"];

type Fp = {
  mechanics?: { em_dash_usage?: (typeof EM_DASH)[number] };
  openers?: { observed?: string[] };
  closers?: { observed?: string[] };
  idioms?: { signature_phrases?: string[]; signature_words?: string[] };
  global_words_in_samples?: string[];
  banned_words_global_allowed?: string[];
  register_label?: (typeof REGISTERS)[number];
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function VoicePage({
  scope,
  ownerId,
  ownerName,
  organizationId,
  resolveOrganization,
  embedded = false,
  brandKind = null,
  personUserId = null,
  brandSurface = false,
}: VoicePageProps) {
  const [rows, setRows] = useState<FingerprintRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<SourceOption[] | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const userId = useAppSelector(selectUserId);
  // On a brand's page the picker starts on that brand's Sources; "All my sources" widens it.
  const [allSources, setAllSources] = useState(false);
  // "brand" measures the brand's voice; "me" measures the signed-in person's own voice as its spokesperson.
  // On a person brand that IS the signed-in user, their own voice is the one measured.
  const personBrand = scope === "brand" && isPersonBrand(brandKind);
  const [selfUserId, setSelfUserId] = useState<string | null>(personUserId);
  const [target, setTarget] = useState<"brand" | "me">(() =>
    personBrand && personUserId && personUserId === userId ? "me" : "brand",
  );
  const [spokes, setSpokes] = useState<FingerprintRow[]>([]);
  const [spokesNonce, setSpokesNonce] = useState(0);
  const brandScoped = scope === "brand" && !allSources && target === "brand";
  // The brand's own social posts (captions, transcripts) are samples too: a brand with no website still has a voice.
  const [socialPosts, setSocialPosts] = useState<SocialSampleOption[] | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  const [measuring, setMeasuring] = useState(false);
  const [measured, setMeasured] = useState<VoiceMeasureResult | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFingerprints(scope, ownerId)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setListError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [scope, ownerId, nonce]);

  useEffect(() => {
    if (scope !== "brand" || !userId) return;
    let cancelled = false;
    listBrandSpokespeople(ownerId)
      .then((data) => {
        if (!cancelled) setSpokes(data.filter((r) => r.person_user_id === userId));
      })
      .catch(() => {
        if (!cancelled) setSpokes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, ownerId, userId, spokesNonce]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchSources(query, brandScoped ? ownerId : null)
        .then((data) => {
          if (!cancelled) {
            setSources(data);
            setSourceError(null);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) setSourceError(errorText(error));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, brandScoped, ownerId]);

  useEffect(() => {
    if (scope !== "brand" || target !== "brand") {
      setSocialPosts([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchBrandSocialSamples(ownerId, query)
        .then((data) => {
          if (!cancelled) {
            setSocialPosts(data);
            setSocialError(null);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) setSocialError(errorText(error));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scope, target, ownerId, query]);

  const togglePost = (post: SocialSampleOption) => {
    const id = `social:${post.postId}`;
    setPicked((list) =>
      list.some((p) => p.source.id === id)
        ? list.filter((p) => p.source.id !== id)
        : list.length >= MAX_SAMPLES
          ? list
          : [
              ...list,
              {
                source: { id, name: `${post.handle ? `@${post.handle}` : post.platform} · ${post.preview}`, created_at: post.postedAt ?? "" },
                kind: sampleKindForPlatform(post.platform),
                social: post,
              },
            ],
    );
  };

  const org = async (): Promise<string> => {
    if (organizationId) return organizationId;
    if (resolveOrganization) return resolveOrganization();
    // No organization known and no resolver: hold and ask (the person picks), never a refusal of our own.
    // org-filter: write-target writes into the organization the person is working in; no list reads it
    return ensureOrgId(null);
  };

  const current = rows?.[0] ?? null;
  // Only the newest measurement asks for confirmation; an older draft under a
  // newer confirmed voice is history, not a pending question.
  const toConfirm = current?.status === "draft" ? current : null;
  const [saved, setSaved] = useState<ConfirmedVoice | null>(null);
  const spokeToConfirm = spokes.find((r) => r.status === "draft") ?? null;

  // The fix-a-draft box lives here so the agent surface can read and stage it.
  const [fixDraftText, setFixDraftText] = useState("");
  const [fixSurface, setFixSurface] = useState<VoiceSurface>("pitch");
  const [fixOutcome, setFixOutcome] = useState<VoiceTextOutcome | null>(null);
  const confirmBridge = useRef<ConfirmBridge | null>(null);

  const measure = async () => {
    setMeasuring(true);
    setMeasureError(null);
    try {
      const asMe = scope === "brand" && target === "me";
      if (asMe && !userId) throw new Error("Sign in to measure your own voice.");
      // A person's voice is fingerprinted only by that person, so "me" is a person-scope
      // measurement filed in this brand's organization, then linked to the brand.
      const organization = await org();
      // A social post becomes a Source only now, when it is actually measured (one Source per post).
      const refs = await Promise.all(
        picked.map(async (p) => ({
          source_id: p.social
            ? await landSocialSample({ option: p.social, organizationId: organization, userId: userId as string })
            : p.source.id,
          source: p.kind,
        })),
      );
      const result = await measureVoice(
        organization,
        asMe ? "person" : scope,
        asMe ? (userId as string) : ownerId,
        refs,
      );
      if (asMe && result.fingerprint_id) {
        await setSpokespersonBrand(result.fingerprint_id, ownerId);
        setSpokesNonce((n) => n + 1);
      }
      setMeasured(result);
      setNonce((n) => n + 1);
    } catch (error) {
      setMeasureError(errorText(error));
    } finally {
      setMeasuring(false);
    }
  };

  const startMeasureMine = () => {
    setTarget("me");
    setAllSources(true);
    setPicked([]);
    document.getElementById("voice-samples")?.scrollIntoView({ block: "start" });
  };

  const getOwnSurfaceValues = () => {
    const pickedRows = picked.map((p) => ({
      source_id: p.source.id,
      name: p.source.name,
      kind: p.kind,
      from: p.social ? "social" : "source",
    }));
    const triage = measured?.triage;
    return {
      voice_whose: target,
      voice_search_query: query,
      voice_samples_picked: pickedRows,
      ...(current
        ? {
            voice_current: {
              status: current.status,
              confidence: current.confidence,
              register_label: current.register_label,
              sample_count: current.sample_count,
              sample_word_count: current.sample_word_count,
              last_extracted_at: current.last_extracted_at,
              refresh_due_at: current.refresh_due_at,
              confirmed_at: current.confirmed_at,
            },
            voice_fingerprint: current.fingerprint,
          }
        : {}),
      ...(saved ? { voice_saved_summary_line: saved.summary_line } : {}),
      ...(sources
        ? {
            voice_sample_candidates: sources.map((s) => ({
              source_id: s.id,
              name: s.name,
              created_at: s.created_at,
            })),
          }
        : {}),
      ...(socialPosts && scope === "brand" && target === "brand"
        ? {
            voice_social_candidates: socialPosts.map((post) => ({
              post_id: post.postId,
              platform: post.platform,
              handle: post.handle,
              text_kind: post.textKind,
              preview: post.preview,
            })),
          }
        : {}),
      voice_spokespeople: spokes.map((r) => ({
        id: r.id,
        status: r.status,
        confidence: r.confidence,
        sample_count: r.sample_count,
        last_extracted_at: r.last_extracted_at,
      })),
      ...(triage
        ? {
            voice_measure_triage: {
              sample_count: triage.sample_count,
              total_words: triage.total_words,
              ai_tell_share: triage.ai_tell_share,
              register_split: Boolean(triage.register_split),
              confidence: triage.confidence,
              warnings: triage.warnings ?? [],
              saved: Boolean(measured?.fingerprint_id),
            },
          }
        : {}),
      ...(confirmBridge.current ? { voice_confirm_choices: confirmBridge.current.snapshot } : {}),
      ...(current?.status === "confirmed"
        ? {
            voice_fix_draft: fixDraftText,
            voice_fix_surface: fixSurface,
            ...(fixOutcome
              ? {
                  voice_fix_outcome: {
                    status: fixOutcome.status,
                    retries: fixOutcome.retries,
                    initial_tells: fixOutcome.initial_tells ?? [],
                    text: fixOutcome.text,
                  },
                }
              : {}),
          }
        : {}),
    };
  };

  const writeHandlers = {
    samplesPicked: (value: unknown) => {
      if (!Array.isArray(value)) {
        throw new Error("voice_samples_picked takes an array of { source_id, kind? }.");
      }
      if (value.length > MAX_SAMPLES) {
        throw new Error(`A measurement uses at most ${MAX_SAMPLES} samples.`);
      }
      const next: Picked[] = [];
      const seen = new Set<string>();
      for (const entry of value as unknown[]) {
        if (!entry || typeof entry !== "object") throw new Error("Each sample must be { source_id, kind? }.");
        const { source_id: id, kind } = entry as { source_id?: unknown; kind?: unknown };
        if (typeof id !== "string") throw new Error("Each sample needs a source_id string.");
        if (seen.has(id)) throw new Error(`source_id ${id} is listed twice.`);
        seen.add(id);
        if (kind !== undefined && !SAMPLE_KINDS.includes(kind as VoiceSampleKind)) {
          throw new Error(`kind must be one of ${SAMPLE_KINDS.join(", ")}.`);
        }
        const asKind = (kind as VoiceSampleKind | undefined) ?? "other";
        if (id.startsWith("social:")) {
          const post = socialPosts?.find((p) => `social:${p.postId}` === id);
          if (!post) throw new Error(`${id} is not a social post offered on this page (see voice_social_candidates).`);
          next.push({
            source: { id, name: `${post.handle ? `@${post.handle}` : post.platform} · ${post.preview}`, created_at: post.postedAt ?? "" },
            kind: kind === undefined ? sampleKindForPlatform(post.platform) : asKind,
            social: post,
          });
        } else {
          const option =
            sources?.find((s) => s.id === id) ?? picked.find((p) => p.source.id === id)?.source;
          if (!option) throw new Error(`${id} is not a Source offered on this page (see voice_sample_candidates).`);
          next.push({ source: option, kind: asKind });
        }
      }
      setPicked(next);
    },
    confirmChoices: (value: unknown) => {
      const bridge = confirmBridge.current;
      if (!bridge) throw new Error("No measured voice is waiting for confirmation on this page.");
      bridge.apply(value);
    },
    fixDraft: (value: unknown) => {
      if (current?.status !== "confirmed") throw new Error("The draft box appears once a voice is confirmed.");
      if (typeof value !== "string") throw new Error("voice_fix_draft takes the full draft text as a string.");
      setFixDraftText(value);
    },
    fixSurface: (value: unknown) => {
      if (current?.status !== "confirmed") throw new Error("The channel choice appears once a voice is confirmed.");
      if (typeof value !== "string" || !SURFACES.includes(value as VoiceSurface)) {
        throw new Error(`voice_fix_surface must be one of ${SURFACES.join(", ")}.`);
      }
      setFixSurface(value as VoiceSurface);
    },
  };

  const whoWrote = scope !== "brand" ? "you wrote" : personBrand ? "they wrote" : "the brand published";

  const page = (
    <div className={embedded ? undefined : "h-full overflow-y-auto bg-textured"}>
      <div
        className={
          embedded
            ? "mx-auto w-full max-w-6xl space-y-3"
            : "mx-auto w-full max-w-6xl space-y-3 px-3 pb-10 pt-[calc(var(--shell-header-h)+1rem)] sm:px-4"
        }
      >
        <header className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-1 type-title text-foreground">
            {ownerName} · Voice
            <AboutPeek
              title="Voice"
              about={`${scope === "brand" ? brandKindCopy(brandKind).voiceLine : "How you actually write"}, measured from real writing. Every pitch, reply, subject line and statement written in ${scope === "brand" ? brandKindCopy(brandKind).possessive : "your"} name is checked against it, and the AI tells are rewritten before you see the draft.`}
            />
          </h1>
        </header>

        {personBrand ? (
          <PersonVoiceBar
            brandId={ownerId}
            brandName={ownerName}
            personUserId={selfUserId}
            onClaimed={setSelfUserId}
            onMeasureMine={startMeasureMine}
          />
        ) : null}

        <div className="grid items-start gap-3 lg:grid-cols-2">
          <SectionCard
            title="Current voice"
            about={`The newest measured voice. Drafts are voice-checked only once a voice is confirmed. Measure one from ${MIN_SAMPLES} to ${MAX_SAMPLES} samples below.`}
          >
            <div className="p-3" data-testid="voice-current">
              {listError ? (
                <p className="type-secondary text-destructive">{listError}<ErrorAlchemyMenu error={listError} /></p>
              ) : rows === null ? (
                <p className="flex items-center gap-2 type-secondary text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading saved voices
                </p>
              ) : current === null ? (
                <p className="type-secondary text-muted-foreground">No voice measured yet</p>
              ) : (
                <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <PropertyRow label="Status">
                    <Badge variant={current.status === "confirmed" ? "default" : "secondary"}>
                      {current.status === "confirmed" ? "Confirmed" : "Needs your confirmation"}
                    </Badge>
                  </PropertyRow>
                  <PropertyRow label="Confidence" value={String(current.confidence)} />
                  <PropertyRow
                    label="Samples"
                    value={`${current.sample_count} · ${formatCount(current.sample_word_count)} words`}
                  />
                  <PropertyRow
                    label="Measured"
                    value={new Date(current.last_extracted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                  <PropertyRow label="Refresh" data-testid="voice-refresh" value={refreshLabel(current.refresh_due_at)} />
                </div>
                <MeasuredVoice fingerprint={current.fingerprint} />
                </>
              )}
              {saved ? (
                <div className="mt-3 border-t border-border pt-3" data-testid="voice-saved">
                  <PropertyRow label={scope === "brand" ? "Saved · the brand's voice line" : "Saved · summary"} value={saved.summary_line} />
                </div>
              ) : null}
            </div>
          </SectionCard>

          {scope === "brand" ? (
            <SpokespeoplePanel
              key={spokesNonce}
              brandId={ownerId}
              brandName={ownerName}
              organizationId={organizationId}
              onMeasureMine={startMeasureMine}
            />
          ) : null}
        </div>

        <SectionCard
          title="Samples from Sources"
          anchor="voice-samples"
          about={`Pick ${MIN_SAMPLES} to ${MAX_SAMPLES} short, recent, unedited pieces ${whoWrote} (emails, posts, Slack). The voice is measured from exactly these.`}
          headerExtra={
            scope === "brand" ? (
              <div className="flex items-center gap-2" data-testid="voice-source-scope">
                {target === "brand" ? (
                  <Button variant="quiet" onClick={() => setAllSources((v) => !v)}>
                    {allSources ? "This brand's sources" : "All my sources"}
                  </Button>
                ) : null}
                <SegmentedControl<"brand" | "me">
                  aria-label="Whose voice"
                  value={target}
                  onValueChange={(next) => {
                    setTarget(next);
                    setAllSources(next === "me");
                    setPicked([]);
                  }}
                  data={[
                    { value: "brand", label: "Brand voice" },
                    { value: "me", label: "My voice" },
                  ]}
                />
              </div>
            ) : null
          }
        >
          <div className="space-y-3 p-3">
            <ProInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Sources by name"
              aria-label="Search Sources"
              startIcon={<Search className="h-4 w-4 text-muted-foreground" aria-hidden />}
            />
            {sourceError ? <p className="type-secondary text-destructive">{sourceError}<ErrorAlchemyMenu error={sourceError} /></p> : null}
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border" data-testid="voice-sources">
              {sources === null ? (
                <li className="flex items-center gap-2 px-3 py-2 type-secondary text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Listing Sources
                </li>
              ) : sources.length === 0 ? (
                <li className="px-3 py-2 type-secondary text-muted-foreground">
                  {brandScoped
                    // read-gate-exempt: sources stay null when the read fails; sourceError shows above
                    ? "No Sources for this brand yet. Try All my sources."
                    : "No Sources match. Add writing to Knowledge first."}
                </li>
              ) : (
                sources.map((source) => {
                  const chosen = picked.find((p) => p.source.id === source.id);
                  return (
                    <li key={source.id} className="flex min-h-10 items-center gap-2 px-3 py-1.5 type-body">
                      <input
                        type="checkbox"
                        aria-label={`Use ${source.name}`}
                        checked={Boolean(chosen)}
                        onChange={() =>
                          setPicked((list) =>
                            chosen
                              ? list.filter((p) => p.source.id !== source.id)
                              : list.length >= MAX_SAMPLES
                                ? list
                                : [...list, { source, kind: "other" }],
                          )
                        }
                      />
                      <Link href={sourceHref(source.id)} className="min-w-0 flex-1 truncate text-foreground hover:underline" target="_blank">
                        {source.name}
                      </Link>
                      {chosen ? (
                        <Select<VoiceSampleKind>
                          aria-label={`Kind of ${source.name}`}
                          value={chosen.kind}
                          onValueChange={(kind) =>
                            setPicked((list) =>
                              list.map((p) =>
                                p.source.id === source.id ? { ...p, kind } : p,
                              ),
                            )
                          }
                          options={SAMPLE_KINDS.map((k) => ({ value: k, label: k }))}
                        />
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {scope === "brand" && target === "brand" ? (
              <div className="space-y-1.5" data-testid="voice-social-samples">
                <h3 className="type-label">The brand&apos;s own social posts</h3>
                {socialError ? <p className="type-secondary text-destructive">{socialError}<ErrorAlchemyMenu error={socialError} /></p> : null}
                <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {socialPosts === null ? (
                    <li className="flex items-center gap-2 px-3 py-2 type-secondary text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Listing posts
                    </li>
                  ) : socialPosts.length === 0 ? (
                    <li className="flex flex-wrap items-center gap-x-2 px-3 py-2 type-secondary text-muted-foreground">
                      {/* read-gate-exempt: socialPosts stay null when the read fails; socialError shows above */}
                      No tracked posts yet
                      <Link href={marketingRoutes.brandSocials(ownerId)} className="text-foreground underline">
                        Track the brand&apos;s accounts
                      </Link>
                    </li>
                  ) : (
                    socialPosts.map((post) => {
                      const id = `social:${post.postId}`;
                      const chosen = picked.find((p) => p.source.id === id);
                      return (
                        <li key={post.postId} className="flex min-h-10 items-center gap-2 px-3 py-1.5 type-body">
                          <input
                            type="checkbox"
                            aria-label={`Use ${post.platform} post ${post.preview.slice(0, 40)}`}
                            checked={Boolean(chosen)}
                            onChange={() => togglePost(post)}
                          />
                          <span className="min-w-0 flex-1 truncate text-foreground">{post.preview}</span>
                          <Badge variant="outline">{post.platform} {post.textKind}</Badge>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button icon={measuring ? <Loader2 className="animate-spin" aria-hidden /> : null} variant="primary" onClick={measure} disabled={measuring || picked.length < MIN_SAMPLES}>
                Measure voice
              </Button>
              <span className="type-secondary text-muted-foreground" data-testid="voice-picked">
                {picked.length} of {MIN_SAMPLES}–{MAX_SAMPLES} picked
                {picked.length < MIN_SAMPLES ? ` · ${MIN_SAMPLES - picked.length} more to measure` : ""}
                {picked.length >= MAX_SAMPLES ? " · maximum reached" : ""}
              </span>
            </div>
            {measureError ? <p className="type-secondary text-destructive">{measureError}<ErrorAlchemyMenu error={measureError} /></p> : null}
            {measured?.triage ? <Triage result={measured} /> : null}
          </div>
        </SectionCard>

        {toConfirm ? (
          <ConfirmCard
            key={toConfirm.id}
            row={toConfirm}
            org={org}
            bridge={
              brandSurface
                ? (next) => {
                    confirmBridge.current = next;
                  }
                : undefined
            }
            onSaved={(result) => {
              setSaved(result);
              setNonce((n) => n + 1);
            }}
          />
        ) : null}

        {spokeToConfirm ? (
          <ConfirmCard
            key={spokeToConfirm.id}
            row={spokeToConfirm}
            org={org}
            onSaved={(result) => {
              setSaved(result);
              setSpokesNonce((n) => n + 1);
            }}
          />
        ) : null}

        {current?.status === "confirmed" ? (
          <TryDraft
            fingerprintId={current.id}
            org={org}
            draft={fixDraftText}
            setDraft={setFixDraftText}
            surface={fixSurface}
            setSurface={setFixSurface}
            outcome={fixOutcome}
            setOutcome={setFixOutcome}
          />
        ) : null}
      </div>
    </div>
  );

  return brandSurface ? (
    <BrandVoiceSurface getOwn={getOwnSurfaceValues} handlers={writeHandlers}>
      {page}
    </BrandVoiceSurface>
  ) : (
    page
  );
}

function Triage({ result }: { result: VoiceMeasureResult }) {
  const t = result.triage!;
  const ai = Math.round((t.ai_tell_share ?? 0) * 100);
  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="voice-triage">
      <h3 className="type-label">What the samples show</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <PropertyRow label="Samples" value={String(t.sample_count)} />
        <PropertyRow label="Words" value={formatCount(t.total_words)} />
        <PropertyRow label="AI-edited share" value={`${ai}%`} />
        <PropertyRow label="Register" value={t.register_split ? "Split in two" : "One register"} />
        <PropertyRow label="Confidence" value={String(t.confidence)} />
      </div>
      {(t.warnings ?? []).length > 0 ? (
        <ul className="space-y-1">
          {(t.warnings ?? []).map((w) => (
            <li key={w} className="flex gap-2 type-secondary text-warning-ink">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      ) : null}
      {result.fingerprint_id ? null : (
        <p className="type-secondary text-muted-foreground">Nothing saved: too little writing to measure</p>
      )}
    </div>
  );
}

function CheckList({
  label,
  items,
  kept,
  onToggle,
  empty,
}: {
  label: string;
  items: string[];
  kept: string[];
  onToggle: (item: string) => void;
  empty: string;
}) {
  return (
    <fieldset className="space-y-1 px-3 py-2">
      <legend className="float-left mb-1 w-full type-label">{label}</legend>
      {items.length === 0 ? (
        <p className="clear-left type-secondary text-muted-foreground">{empty}</p>
      ) : (
        <div className="clear-left flex flex-wrap gap-x-4 gap-y-1">
          {items.map((item) => (
            <label key={item} className="flex items-center gap-1.5 type-body text-foreground">
              <input type="checkbox" checked={kept.includes(item)} onChange={() => onToggle(item)} />
              {item}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function ConfirmCard({
  row,
  org,
  bridge,
  onSaved,
}: {
  row: FingerprintRow;
  org: () => Promise<string>;
  /** Hands the agent surface this card's live choices and a way to set them; null on unmount. */
  bridge?: (next: ConfirmBridge | null) => void;
  onSaved: (result: ConfirmedVoice) => void;
}) {
  const fp = row.fingerprint as Fp;
  const openers = fp.openers?.observed ?? [];
  const closers = fp.closers?.observed ?? [];
  const signature = [...(fp.idioms?.signature_phrases ?? []), ...(fp.idioms?.signature_words ?? [])];
  const globals = fp.global_words_in_samples ?? [];

  const [emDash, setEmDash] = useState<(typeof EM_DASH)[number]>(fp.mechanics?.em_dash_usage ?? "rare");
  const [keptOpeners, setKeptOpeners] = useState<string[]>(openers);
  const [keptClosers, setKeptClosers] = useState<string[]>(closers);
  const [keptSignature, setKeptSignature] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<string[]>(fp.banned_words_global_allowed ?? []);
  const [register, setRegister] = useState<(typeof REGISTERS)[number]>(fp.register_label ?? "professional");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bridge) return;
    bridge({
      snapshot: {
        em_dash_usage: emDash,
        measured_em_dash_usage: fp.mechanics?.em_dash_usage ?? null,
        register_label: register,
        openers: { offered: openers, kept: keptOpeners },
        closers: { offered: closers, kept: keptClosers },
        signature_phrases: { offered: signature, kept: keptSignature },
        banned_words_allowed: { offered: globals, kept: allowed },
      },
      apply: (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("voice_confirm_choices takes an object of the fields to set.");
        }
        const input = value as Record<string, unknown>;
        const known = ["em_dash_usage", "register_label", "openers_kept", "closers_kept", "signature_phrases_kept", "banned_words_allowed"];
        const stray = Object.keys(input).filter((k) => !known.includes(k));
        if (stray.length) throw new Error(`voice_confirm_choices has unknown field(s): ${stray.join(", ")}.`);
        const list = (field: string, offered: string[]): string[] | undefined => {
          const raw = input[field];
          if (raw === undefined) return undefined;
          if (!Array.isArray(raw) || raw.some((x) => typeof x !== "string")) {
            throw new Error(`${field} must be an array of strings.`);
          }
          const bad = (raw as string[]).filter((x) => !offered.includes(x));
          if (bad.length) throw new Error(`${field} can only use offered items; not offered: ${bad.join(", ")}.`);
          return raw as string[];
        };
        if (input.em_dash_usage !== undefined && !EM_DASH.includes(input.em_dash_usage as (typeof EM_DASH)[number])) {
          throw new Error(`em_dash_usage must be one of ${EM_DASH.join(", ")}.`);
        }
        if (input.register_label !== undefined && !REGISTERS.includes(input.register_label as (typeof REGISTERS)[number])) {
          throw new Error(`register_label must be one of ${REGISTERS.join(", ")}.`);
        }
        const nextOpeners = list("openers_kept", openers);
        const nextClosers = list("closers_kept", closers);
        const nextSignature = list("signature_phrases_kept", signature);
        const nextAllowed = list("banned_words_allowed", globals);
        if (input.em_dash_usage !== undefined) setEmDash(input.em_dash_usage as (typeof EM_DASH)[number]);
        if (input.register_label !== undefined) setRegister(input.register_label as (typeof REGISTERS)[number]);
        if (nextOpeners) setKeptOpeners(nextOpeners);
        if (nextClosers) setKeptClosers(nextClosers);
        if (nextSignature) setKeptSignature(nextSignature);
        if (nextAllowed) setAllowed(nextAllowed);
      },
    });
    return () => bridge(null);
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await confirmVoice(await org(), row.id, {
        em_dash_usage: emDash,
        openers: keptOpeners,
        closers: keptClosers,
        signature_phrases: keptSignature,
        banned_words_allowed: allowed,
        register_label: register,
      });
      onSaved(result);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Confirm before it is used"
      about="These are the fields that make drafts sound AI-written when they are wrong. Nothing checks drafts against this voice until you save."
    >
      <div className="divide-y divide-border" data-testid="voice-confirm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2">
          <label className="flex items-center gap-2">
            <span className="type-label">Em dashes</span>
            <Select<(typeof EM_DASH)[number]>
              aria-label="Em dashes"
              value={emDash}
              onValueChange={setEmDash}
              options={EM_DASH.map((v) => ({ value: v, label: v }))}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="type-label">Register</span>
            <Select<(typeof REGISTERS)[number]>
              aria-label="Register"
              value={register}
              onValueChange={setRegister}
              options={REGISTERS.map((v) => ({ value: v, label: v }))}
            />
          </label>
          {emDash !== "never" && fp.mechanics?.em_dash_usage === "never" ? (
            <span className="inline-flex items-center gap-1 type-secondary text-warning-ink">
              Your samples never use an em dash
              <AboutPeek
                title="Em dash"
                about="Allowing em dashes the samples never use is the most common way a draft reads as AI."
              />
            </span>
          ) : null}
        </div>
        <CheckList
          label="Openers you use"
          items={openers}
          kept={keptOpeners}
          onToggle={(i) => setKeptOpeners((l) => toggle(l, i))}
          empty="No repeated openers found."
        />
        <CheckList
          label="Closers you use"
          items={closers}
          kept={keptClosers}
          onToggle={(i) => setKeptClosers((l) => toggle(l, i))}
          empty="No repeated closers found."
        />
        <CheckList
          label="Signature phrases that really are yours"
          items={signature}
          kept={keptSignature}
          onToggle={(i) => setKeptSignature((l) => toggle(l, i))}
          empty="No signature phrases stood out."
        />
        <CheckList
          label="Words on the banned list you genuinely use"
          items={globals}
          kept={allowed}
          onToggle={(i) => setAllowed((l) => toggle(l, i))}
          empty="No globally banned words in the samples."
        />
        <div className="flex items-center gap-3 px-3 py-2">
          <Button icon={saving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} variant="primary" onClick={save} disabled={saving}>
            Save voice
          </Button>
          {error ? <span className="type-secondary text-destructive">{error}<ErrorAlchemyMenu error={error} /></span> : null}
        </div>
      </div>
    </SectionCard>
  );
}

function TryDraft({
  fingerprintId,
  org,
  draft,
  setDraft,
  surface,
  setSurface,
  outcome,
  setOutcome,
}: {
  fingerprintId: string;
  org: () => Promise<string>;
  draft: string;
  setDraft: (next: string) => void;
  surface: VoiceSurface;
  setSurface: (next: VoiceSurface) => void;
  outcome: VoiceTextOutcome | null;
  setOutcome: (next: VoiceTextOutcome | null) => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setOutcome(null);
    try {
      setOutcome(await fixVoice(await org(), fingerprintId, draft, surface));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <SectionCard
      title="Fix a draft's voice"
      about="The same check every drafting job runs: the tells are found, rewritten span by span with every fact kept, and re-checked. A draft that still fails comes back with a header naming what is left."
    >
      <div className="space-y-3 p-3" data-testid="voice-try">
        <ProTextarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} placeholder="Paste a draft" aria-label="Draft" />
        <div className="flex flex-wrap items-center gap-3">
          <Select<VoiceSurface>
            aria-label="Where it will appear"
            value={surface}
            onValueChange={setSurface}
            options={SURFACES.map((s) => ({ value: s, label: s }))}
          />
          <Button icon={running ? <Loader2 className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />} variant="primary" onClick={run} disabled={running || !draft.trim()}>
            Fix voice
          </Button>
          {error ? <span className="type-secondary text-destructive">{error}<ErrorAlchemyMenu error={error} /></span> : null}
        </div>
        {outcome ? (
          <div className="space-y-2 border-t border-border pt-3" data-testid="voice-outcome">
            <p className="type-title text-foreground">
              {outcome.status === "passed"
                ? "Passes the voice check as written."
                : outcome.status === "fixed"
                  ? `Fixed in ${outcome.retries} ${outcome.retries === 1 ? "rewrite" : "rewrites"}.`
                  : "Still fails after the allowed rewrites; returned for review."}
            </p>
            {(outcome.initial_tells ?? []).length > 0 ? (
              <p className="type-secondary text-muted-foreground">Tells found: {(outcome.initial_tells ?? []).join(", ")}</p>
            ) : null}
            {(outcome.rounds ?? []).map((r) => (
              <p key={r.attempt} className="type-secondary text-muted-foreground">
                Rewrite {r.attempt}:{" "}
                {r.error
                  ? `failed (${r.error})`
                  : `${(r.changes ?? []).length} change(s)${(r.unfixable ?? []).length ? `; could not fix ${(r.unfixable ?? []).map((u) => String(u.rule_id)).join(", ")}` : ""}`}
              </p>
            ))}
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans type-body text-foreground">{outcome.text}</pre>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
