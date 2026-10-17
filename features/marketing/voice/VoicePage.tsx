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
import { useEffect, useState } from "react";
import Link from "next/link";
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
import { SpokespeoplePanel } from "./SpokespeoplePanel";
import { PersonVoiceBar } from "./PersonVoiceBar";
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
  const whoWrote = scope !== "brand" ? "you wrote" : personBrand ? "they wrote" : "the brand published";

  return (
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
                {picked.length >= MAX_SAMPLES ? " · the most one voice uses" : ""}
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

        {current?.status === "confirmed" ? <TryDraft fingerprintId={current.id} org={org} /> : null}
      </div>
    </div>
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
  onSaved,
}: {
  row: FingerprintRow;
  org: () => Promise<string>;
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
            <span
              className="type-secondary text-warning-ink"
              title="Allowing em dashes the samples never use is the most common way a draft reads as AI."
            >
              Your samples never use an em dash
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

function TryDraft({ fingerprintId, org }: { fingerprintId: string; org: () => Promise<string> }) {
  const [draft, setDraft] = useState("");
  const [surface, setSurface] = useState<VoiceSurface>("pitch");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<VoiceTextOutcome | null>(null);
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
