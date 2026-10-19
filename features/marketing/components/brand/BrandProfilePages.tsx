"use client";

/**
 * Brand fundamentals editors (Brand Home → Messaging, Claims & compliance).
 * Both write ONLY their own keys into `web.brand.profile` through
 * `mergeBrandProfile`, so every other profile key survives the save.
 */

import { useState, type ReactNode } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnsavedChangesGuard } from "@/lib/navigation/useUnsavedChangesGuard";
import { isPersonBrand } from "@/features/marketing/lib/brand-kind";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";
import { useBrand, useUpdateBrand } from "@/features/marketing/data/hooks";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";
import {
  LoadingSurface,
  SectionCard,
} from "@/features/marketing/components/shared/MarketingUi";
import {
  HASHTAG_USES,
  displayHashtag,
  mergeBrandProfile,
  parseBrandProfile,
  type BrandHashtag,
  type BrandProfile,
  type ContentPillar,
  type MarketingBrand,
  type MessagingPillar,
} from "@/features/marketing/types";
import { extractErrorMessage } from "@/utils/errors";
import { BrandRoomSurface } from "@/features/marketing/components/brand/BrandRoomSurface";
import {
  asStringList,
  normalizeRoomProfilePatch,
} from "@/features/marketing/lib/brand-room-write";
import { createMarketingBrandMessagingScope } from "@/features/surfaces/manifests/marketing-brand-messaging.manifest";
import { createMarketingBrandClaimsScope } from "@/features/surfaces/manifests/marketing-brand-claims.manifest";

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** What the page says about its save: the repo's AutosaveIndicator, kept after the toast is gone. */
interface SaveReport {
  savedAt: Date | null;
  failed: boolean;
}

function PageFrame({
  title,
  hint,
  busy,
  dirty,
  onSave,
  saved,
  children,
}: {
  title: string;
  hint: string;
  busy: boolean;
  dirty: boolean;
  onSave: () => void;
  saved: SaveReport;
  children: ReactNode;
}) {
  // A typed-but-unsaved edit is never lost to a link, Back or a refresh.
  useUnsavedChangesGuard({
    when: dirty && !busy,
    what: `your changes to ${title}`,
  });
  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-[calc(var(--shell-header-h)+1rem)] sm:px-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            <AboutPeek title={title} about={hint} />
          </div>
          <div className="flex items-center gap-3">
            <AutosaveIndicator
              status={
                busy
                  ? "saving"
                  : dirty
                    ? "unsaved"
                    : saved.failed
                      ? "error"
                      : saved.savedAt
                        ? "saved"
                        : "idle"
              }
              lastSavedAt={saved.savedAt}
            />
            <Button
              variant="primary"
              disabled={busy || !dirty}
              icon={busy ? <Loader2 className="animate-spin" /> : null}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
        </header>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {hint ? <AboutPeek title={label} about={hint} /> : null}
      </div>
      {children}
    </div>
  );
}

function Text({
  value,
  onChange,
  rows = 2,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  label: string;
}) {
  return (
    <ProTextarea
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="text-base sm:text-sm"
    />
  );
}

function useProfileSave(
  brand: MarketingBrand,
  report: (next: SaveReport) => void,
) {
  const update = useUpdateBrand();
  const save = async (edited: BrandProfile) => {
    try {
      await update.mutateAsync({
        brandId: brand.id,
        expectedVersion: brand.version,
        patch: { profile: mergeBrandProfile(brand.profile, edited) },
      });
      report({ savedAt: new Date(), failed: false });
      toast.success("Saved");
    } catch (error) {
      report({ savedAt: null, failed: true });
      toast.error("Could not save", {
        description: extractErrorMessage(error),
      });
    }
  };
  return { save, busy: update.isPending };
}

/** Loads the brand, then remounts the editor per stored version so the draft restarts clean. */
function WithBrand({
  brandId,
  render,
}: {
  brandId: string;
  render: (
    brand: MarketingBrand,
    saved: SaveReport,
    report: (next: SaveReport) => void,
  ) => ReactNode;
}) {
  const brand = useBrand(brandId);
  // Held here, above the per-version remount, so "Saved" survives the editor restarting clean.
  const [saved, setSaved] = useState<SaveReport>({
    savedAt: null,
    failed: false,
  });
  if (!brand.data) return <LoadingSurface label="Loading brand…" />;
  return (
    <div key={brand.data.version} className="contents">
      {render(brand.data, saved, setSaved)}
    </div>
  );
}

// ── Messaging ────────────────────────────────────────────────────────────

export function BrandMessagingPage({ brandId }: { brandId: string }) {
  return (
    <WithBrand
      brandId={brandId}
      render={(brand, saved, report) => (
        <MessagingEditor brand={brand} saved={saved} report={report} />
      )}
    />
  );
}

function MessagingEditor({
  brand,
  saved,
  report,
}: {
  brand: MarketingBrand;
  saved: SaveReport;
  report: (next: SaveReport) => void;
}) {
  const stored = parseBrandProfile(brand.profile);
  const { save, busy } = useProfileSave(brand, report);
  const [mission, setMission] = useState(stored.mission ?? "");
  const [vision, setVision] = useState(stored.vision ?? "");
  const [story, setStory] = useState(stored.story ?? "");
  const [values, setValues] = useState((stored.values ?? []).join("\n"));
  const [pitches, setPitches] = useState({
    ten_second: stored.elevator_pitches?.ten_second ?? "",
    thirty_second: stored.elevator_pitches?.thirty_second ?? "",
    sixty_second: stored.elevator_pitches?.sixty_second ?? "",
  });
  const [pillars, setPillars] = useState<
    Array<{ title: string; proof: string }>
  >(
    (stored.messaging_pillars ?? []).map((p) => ({
      title: p.title,
      proof: p.proof_points.join("\n"),
    })),
  );
  const [content, setContent] = useState<ContentPillar[]>(
    (stored.content_pillars ?? []).map((p) => ({
      name: p.name,
      description: p.description ?? "",
    })),
  );
  const [tags, setTags] = useState<BrandHashtag[]>(stored.hashtags ?? []);
  const [aliases, setAliases] = useState(
    (stored.brand_aliases ?? []).join("\n"),
  );
  const [usp, setUsp] = useState(stored.usp ?? "");
  const [promise, setPromise] = useState(stored.brand_promise ?? "");
  const [personality, setPersonality] = useState(
    (stored.personality ?? []).join("\n"),
  );
  const [imagery, setImagery] = useState(stored.imagery_style ?? "");
  const [iconography, setIconography] = useState(stored.iconography ?? "");
  const [vocabUse, setVocabUse] = useState(
    (stored.vocabulary?.use ?? []).join("\n"),
  );
  const [vocabAvoid, setVocabAvoid] = useState(
    (stored.vocabulary?.avoid ?? []).join("\n"),
  );

  const edited: BrandProfile = {
    ...stored,
    mission: mission.trim() || undefined,
    vision: vision.trim() || undefined,
    story: story.trim() || undefined,
    values: lines(values),
    elevator_pitches: {
      ten_second: pitches.ten_second.trim() || undefined,
      thirty_second: pitches.thirty_second.trim() || undefined,
      sixty_second: pitches.sixty_second.trim() || undefined,
    },
    messaging_pillars: pillars.map((p): MessagingPillar => ({
      title: p.title,
      proof_points: lines(p.proof),
    })),
    content_pillars: content,
    hashtags: tags,
    brand_aliases: lines(aliases),
    usp: usp.trim() || undefined,
    brand_promise: promise.trim() || undefined,
    personality: lines(personality),
    imagery_style: imagery.trim() || undefined,
    iconography: iconography.trim() || undefined,
    vocabulary: { use: lines(vocabUse), avoid: lines(vocabAvoid) },
  };
  const cleaned = parseBrandProfile(mergeBrandProfile(brand.profile, edited));
  const dirty = JSON.stringify(cleaned) !== JSON.stringify(stored);

  // Draft write targets: validate with the parent's profile merge, then stage
  // into the editor state above. The person presses Save.
  const stage = (
    target: string,
    keys: readonly string[],
    value: unknown,
  ): BrandProfile =>
    normalizeRoomProfilePatch(target, keys, brand.profile, value);
  const pillarRows = (list: MessagingPillar[] | undefined) =>
    (list ?? []).map((p) => ({
      title: p.title,
      proof: p.proof_points.join("\n"),
    }));
  const handlers = {
    messaging_purpose: async (value: unknown) => {
      const p = stage(
        "messaging_purpose",
        ["mission", "vision", "story", "values"],
        value,
      );
      const v = value as Record<string, unknown>;
      if ("mission" in v) setMission(p.mission ?? "");
      if ("vision" in v) setVision(p.vision ?? "");
      if ("story" in v) setStory(p.story ?? "");
      if ("values" in v) setValues((p.values ?? []).join("\n"));
    },
    messaging_voice_identity: async (value: unknown) => {
      const v = value as Record<string, unknown>;
      // vocabulary is replaced whole by the merge: carry the on-screen half the caller omitted.
      const input =
        v &&
        typeof v === "object" &&
        v.vocabulary &&
        typeof v.vocabulary === "object"
          ? {
              ...v,
              vocabulary: {
                use: lines(vocabUse),
                avoid: lines(vocabAvoid),
                ...(v.vocabulary as Record<string, unknown>),
              },
            }
          : value;
      const p = stage(
        "messaging_voice_identity",
        [
          "brand_aliases",
          "personality",
          "usp",
          "brand_promise",
          "imagery_style",
          "iconography",
          "vocabulary",
        ],
        input,
      );
      if ("brand_aliases" in v) setAliases((p.brand_aliases ?? []).join("\n"));
      if ("personality" in v) setPersonality((p.personality ?? []).join("\n"));
      if ("usp" in v) setUsp(p.usp ?? "");
      if ("brand_promise" in v) setPromise(p.brand_promise ?? "");
      if ("imagery_style" in v) setImagery(p.imagery_style ?? "");
      if ("iconography" in v) setIconography(p.iconography ?? "");
      if ("vocabulary" in v) {
        setVocabUse((p.vocabulary?.use ?? []).join("\n"));
        setVocabAvoid((p.vocabulary?.avoid ?? []).join("\n"));
      }
    },
    messaging_elevator_pitches: async (value: unknown) => {
      const p = stage("messaging_elevator_pitches", ["elevator_pitches"], {
        elevator_pitches: { ...pitches, ...(value as Record<string, unknown>) },
      });
      setPitches({
        ten_second: p.elevator_pitches?.ten_second ?? "",
        thirty_second: p.elevator_pitches?.thirty_second ?? "",
        sixty_second: p.elevator_pitches?.sixty_second ?? "",
      });
    },
    messaging_pillars: async (value: unknown) => {
      const p = stage("messaging_pillars", ["messaging_pillars"], {
        messaging_pillars: value,
      });
      setPillars(pillarRows(p.messaging_pillars));
    },
    messaging_content_pillars: async (value: unknown) => {
      const p = stage("messaging_content_pillars", ["content_pillars"], {
        content_pillars: value,
      });
      setContent(
        (p.content_pillars ?? []).map((c) => ({
          name: c.name,
          description: c.description ?? "",
        })),
      );
    },
    messaging_hashtags: async (value: unknown) => {
      const p = stage("messaging_hashtags", ["hashtags"], { hashtags: value });
      setTags(p.hashtags ?? []);
    },
  };
  const buildScope = (base: Record<string, unknown>) => {
    const own = {
      messaging_mission: mission,
      messaging_vision: vision,
      messaging_values: lines(values),
      messaging_story: story,
      messaging_aliases: lines(aliases),
      messaging_personality: lines(personality),
      messaging_usp: usp,
      messaging_brand_promise: promise,
      messaging_imagery_style: imagery,
      messaging_iconography: iconography,
      messaging_vocabulary: { use: lines(vocabUse), avoid: lines(vocabAvoid) },
      messaging_elevator_pitches: { ...pitches },
      messaging_pillars: pillars.map((p) => ({
        title: p.title,
        proof_points: lines(p.proof),
      })),
      messaging_content_pillars: content.map((c) => ({
        name: c.name,
        description: c.description ?? "",
      })),
      messaging_hashtags: tags.map((t) => ({ tag: t.tag, use: t.use })),
    };
    return createMarketingBrandMessagingScope({
      ...(base as { brand_id: string }),
      ...own,
      messaging_profile: {
        mission: own.messaging_mission,
        vision: own.messaging_vision,
        story: own.messaging_story,
        values: own.messaging_values,
        brand_aliases: own.messaging_aliases,
        personality: own.messaging_personality,
        usp: own.messaging_usp,
        brand_promise: own.messaging_brand_promise,
        imagery_style: own.messaging_imagery_style,
        iconography: own.messaging_iconography,
        vocabulary: own.messaging_vocabulary,
        elevator_pitches: own.messaging_elevator_pitches,
        messaging_pillars: own.messaging_pillars,
        content_pillars: own.messaging_content_pillars,
        hashtags: own.messaging_hashtags,
      },
    });
  };

  return (
    <BrandRoomSurface
      surfaceName="matrx-user/marketing-brand-messaging"
      buildScope={buildScope}
      handlers={handlers}
    >
      <PageFrame
        title={`${brand.name} · Messaging`}
        hint="What the brand stands for and how it says it"
        busy={busy}
        dirty={dirty}
        onSave={() => void save(edited)}
        saved={saved}
      >
        <SectionCard
          title="Purpose"
          about="Why the brand exists, what it stands for and its story."
        >
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <Field label="Mission" hint="Why the brand exists, today">
              <Text
                label="Mission"
                value={mission}
                onChange={setMission}
                rows={3}
              />
            </Field>
            <Field
              label="Vision"
              hint="What the world looks like if it succeeds"
            >
              <Text
                label="Vision"
                value={vision}
                onChange={setVision}
                rows={3}
              />
            </Field>
            <Field label="Values (one per line)" hint="What the brand holds to">
              <Text
                label="Values"
                value={values}
                onChange={setValues}
                rows={4}
              />
            </Field>
            <Field
              label={isPersonBrand(brand) ? "Story" : "Brand story"}
              hint="The brand story, in short"
            >
              <Text label="Story" value={story} onChange={setStory} rows={4} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Voice and identity"
          about="Names, personality, promise, visual style and the words the brand uses or avoids."
        >
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <Field
              label="Also known as (one per line)"
              hint="Other names, spellings and abbreviations"
            >
              <Text
                label="Aliases"
                value={aliases}
                onChange={setAliases}
                rows={3}
              />
            </Field>
            <Field
              label="Personality (one per line)"
              hint="Traits, e.g. warm, expert, direct"
            >
              <Text
                label="Personality"
                value={personality}
                onChange={setPersonality}
                rows={3}
              />
            </Field>
            <Field
              label="Unique selling point"
              hint="What only this brand offers"
            >
              <Text
                label="Unique selling point"
                value={usp}
                onChange={setUsp}
                rows={2}
              />
            </Field>
            <Field
              label="Brand promise"
              hint="What every customer can count on"
            >
              <Text
                label="Brand promise"
                value={promise}
                onChange={setPromise}
                rows={2}
              />
            </Field>
            <Field
              label="Imagery style"
              hint="Photos and visuals the brand uses"
            >
              <Text
                label="Imagery style"
                value={imagery}
                onChange={setImagery}
                rows={2}
              />
            </Field>
            <Field label="Iconography" hint="Icon style">
              <Text
                label="Iconography"
                value={iconography}
                onChange={setIconography}
                rows={2}
              />
            </Field>
            <Field label="Words we use (one per line)" hint="Preferred terms">
              <Text
                label="Words we use"
                value={vocabUse}
                onChange={setVocabUse}
                rows={3}
              />
            </Field>
            <Field
              label="Words we avoid (one per line)"
              hint="Terms to keep out"
            >
              <Text
                label="Words we avoid"
                value={vocabAvoid}
                onChange={setVocabAvoid}
                rows={3}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Elevator pitches"
          about="The brand in 10, 30 and 60 seconds, for when someone asks what you do."
        >
          <div className="grid gap-3 p-3">
            <Field label="10 seconds" hint="The one-breath version">
              <Text
                label="10 second pitch"
                value={pitches.ten_second}
                onChange={(v) => setPitches({ ...pitches, ten_second: v })}
              />
            </Field>
            <Field label="30 seconds" hint="The short version">
              <Text
                label="30 second pitch"
                value={pitches.thirty_second}
                onChange={(v) => setPitches({ ...pitches, thirty_second: v })}
                rows={3}
              />
            </Field>
            <Field label="60 seconds" hint="The full version">
              <Text
                label="60 second pitch"
                value={pitches.sixty_second}
                onChange={(v) => setPitches({ ...pitches, sixty_second: v })}
                rows={4}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Messaging pillars"
          about="The few big ideas every message returns to, each with the proof behind it."
          headerExtra={
            <Button
              variant="quiet"
              icon={<Plus />}
              onClick={() => setPillars([...pillars, { title: "", proof: "" }])}
            >
              Add
            </Button>
          }
        >
          <div className="grid gap-3 p-3">
            {pillars.map((pillar, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <ProInput
                    aria-label="Pillar title"
                    value={pillar.title}
                    placeholder="Certified, documented destruction"
                    onChange={(event) =>
                      setPillars(
                        pillars.map((p, i) =>
                          i === index ? { ...p, title: event.target.value } : p,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="quiet"
                    aria-label="Remove pillar"
                    icon={<X />}
                    onClick={() =>
                      setPillars(pillars.filter((_, i) => i !== index))
                    }
                  />
                </div>
                <Text
                  label="Proof points, one per line"
                  placeholder="Proof points, one per line"
                  value={pillar.proof}
                  rows={3}
                  onChange={(v) =>
                    setPillars(
                      pillars.map((p, i) =>
                        i === index ? { ...p, proof: v } : p,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Content pillars"
          about="Recurring themes the brand publishes about."
          headerExtra={
            <Button
              variant="quiet"
              icon={<Plus />}
              onClick={() =>
                setContent([...content, { name: "", description: "" }])
              }
            >
              Add
            </Button>
          }
        >
          <div className="grid gap-3 p-3">
            {content.map((pillar, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <ProInput
                  aria-label="Content pillar name"
                  value={pillar.name}
                  placeholder="Compliance explained"
                  onChange={(event) =>
                    setContent(
                      content.map((p, i) =>
                        i === index ? { ...p, name: event.target.value } : p,
                      ),
                    )
                  }
                />
                <ProInput
                  aria-label="Content pillar description"
                  value={pillar.description ?? ""}
                  placeholder="What this theme covers"
                  onChange={(event) =>
                    setContent(
                      content.map((p, i) =>
                        i === index
                          ? { ...p, description: event.target.value }
                          : p,
                      ),
                    )
                  }
                />
                <Button
                  variant="quiet"
                  aria-label="Remove content pillar"
                  icon={<X />}
                  onClick={() =>
                    setContent(content.filter((_, i) => i !== index))
                  }
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Hashtags"
          about="Tags the brand owns or follows, and how each is used."
          headerExtra={
            <Button
              variant="quiet"
              icon={<Plus />}
              onClick={() => setTags([...tags, { tag: "", use: "branded" }])}
            >
              Add
            </Button>
          }
        >
          <div className="grid gap-3 p-3">
            {tags.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_9rem_auto] gap-2">
                {/* ui-exception: a hashtag is a raw social identifier */}
                <Input
                  aria-label="Hashtag"
                  value={displayHashtag(entry.tag)}
                  placeholder="#ShredItRight"
                  onChange={(event) =>
                    setTags(
                      tags.map((t, i) =>
                        i === index ? { ...t, tag: event.target.value } : t,
                      ),
                    )
                  }
                />
                <Select
                  value={entry.use}
                  onValueChange={(value) =>
                    setTags(
                      tags.map((t, i) =>
                        i === index
                          ? {
                              ...t,
                              use:
                                HASHTAG_USES.find((u) => u === value) ??
                                "branded",
                            }
                          : t,
                      ),
                    )
                  }
                >
                  <SelectTrigger
                    aria-label="Hashtag use"
                    className="h-9 text-base sm:text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HASHTAG_USES.map((use) => (
                      <SelectItem key={use} value={use}>
                        {use[0].toUpperCase() + use.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="quiet"
                  aria-label="Remove hashtag"
                  icon={<X />}
                  onClick={() => setTags(tags.filter((_, i) => i !== index))}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </PageFrame>
    </BrandRoomSurface>
  );
}

// ── Claims & compliance ──────────────────────────────────────────────────

export function BrandClaimsPage({ brandId }: { brandId: string }) {
  return (
    <WithBrand
      brandId={brandId}
      render={(brand, saved, report) => (
        <ClaimsEditor brand={brand} saved={saved} report={report} />
      )}
    />
  );
}

function ClaimsEditor({
  brand,
  saved,
  report,
}: {
  brand: MarketingBrand;
  saved: SaveReport;
  report: (next: SaveReport) => void;
}) {
  const stored = parseBrandProfile(brand.profile);
  const { save, busy } = useProfileSave(brand, report);
  const [approved, setApproved] = useState(
    (stored.approved_claims ?? []).join("\n"),
  );
  const [forbidden, setForbidden] = useState(
    (stored.forbidden_claims ?? []).join("\n"),
  );
  const [disclaimers, setDisclaimers] = useState(
    (stored.disclaimers ?? []).join("\n"),
  );
  const edited: BrandProfile = {
    ...stored,
    approved_claims: lines(approved),
    forbidden_claims: lines(forbidden),
    disclaimers: lines(disclaimers),
  };
  const dirty =
    JSON.stringify([
      edited.approved_claims,
      edited.forbidden_claims,
      edited.disclaimers,
    ]) !==
    JSON.stringify([
      stored.approved_claims ?? [],
      stored.forbidden_claims ?? [],
      stored.disclaimers ?? [],
    ]);
  const stageList = (
    target: string,
    key: "approved_claims" | "forbidden_claims" | "disclaimers",
    value: unknown,
  ) =>
    (
      normalizeRoomProfilePatch(target, [key], brand.profile, {
        [key]: asStringList(target, value),
      })[key] ?? []
    ).join("\n");
  const handlers = {
    claims_approved: async (value: unknown) =>
      setApproved(stageList("claims_approved", "approved_claims", value)),
    claims_forbidden: async (value: unknown) =>
      setForbidden(stageList("claims_forbidden", "forbidden_claims", value)),
    claims_disclaimers: async (value: unknown) =>
      setDisclaimers(stageList("claims_disclaimers", "disclaimers", value)),
  };
  const buildScope = (base: Record<string, unknown>) => {
    const own = {
      claims_approved: lines(approved),
      claims_forbidden: lines(forbidden),
      claims_disclaimers: lines(disclaimers),
    };
    return createMarketingBrandClaimsScope({
      ...(base as { brand_id: string }),
      ...own,
      claims_profile: {
        approved_claims: own.claims_approved,
        forbidden_claims: own.claims_forbidden,
        disclaimers: own.claims_disclaimers,
      },
    });
  };
  return (
    <BrandRoomSurface
      surfaceName="matrx-user/marketing-brand-claims"
      buildScope={buildScope}
      handlers={handlers}
    >
      <PageFrame
        title={`${brand.name} · Claims`}
        hint="What may be said, what never may, and the legal wording"
        busy={busy}
        dirty={dirty}
        onSave={() => void save(edited)}
        saved={saved}
      >
        <SectionCard
          title="Claims"
          about="What may be said as written, what must never be said, and the required legal wording."
        >
          <div className="grid gap-3 p-3">
            <Field
              label="Approved claims (one per line)"
              hint="Statements the brand can make as written"
            >
              <Text
                label="Approved claims"
                value={approved}
                onChange={setApproved}
                rows={3}
              />
            </Field>
            <Field
              label="Forbidden claims (one per line)"
              hint="Never say these, in any channel"
            >
              <Text
                label="Forbidden claims"
                value={forbidden}
                onChange={setForbidden}
                rows={3}
              />
            </Field>
            <Field
              label="Disclaimers (one per line)"
              hint="Required wording to attach where it applies"
            >
              <Text
                label="Disclaimers"
                value={disclaimers}
                onChange={setDisclaimers}
                rows={3}
              />
            </Field>
          </div>
        </SectionCard>
      </PageFrame>
    </BrandRoomSurface>
  );
}
