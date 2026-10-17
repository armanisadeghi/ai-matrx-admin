"use client";

// features/ai-models/discovery/DiscoveryContainer.tsx
//
// AI Models › Discovery (unified models P1): paste a Hugging Face link → a checked candidate with
// its variants, files, signature, license, fit and proposed media → the admin picks → promote →
// a test run on the cloud test machine → offered. Ambiguities stop with their code shown in words.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { DiscoveryResultView, ModelDiscovery } from "@ai-matrx/agents/models/react";
import type { LocalVariant } from "@ai-matrx/agents/models";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorNotice } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { extractErrorMessage } from "@/utils/errors";
import {
  type Candidate,
  type CallAuth,
  type CompatRow,
  type PromotedVariant,
  type VerificationRun,
  discoveryApi,
  listCandidates,
  listMakers,
  type Placement,
  loadPlacements,
  loadPromoted,
  testedLabel,
} from "./api";
import { ImagePicker, PlacementFields, TagsField } from "./parts";
import { createAdminDiscoveryPort, resultOfCandidate } from "./discovery-port";
import { detailKey, listNotice, placementWords, samePlacement } from "./placement";
import {
  compatLabel,
  describeRun,
  describeTestClick,
  describeTestRequest,
  promoteBlockedBecause,
} from "./run-words";

const TEST_POLL_SECONDS_KNOB = { feature: "ai.models", key: "test_poll_seconds" } as const;
const TEST_POLL_COUNT_KNOB = { feature: "ai.models", key: "test_poll_count" } as const;

const localTime = (iso: string) => new Date(iso).toLocaleString();

function useAuth(): CallAuth {
  return {
    accessToken: useAppSelector(selectAccessToken) ?? null,
    baseUrl: useAppSelector(selectResolvedBaseUrl) ?? null,
    organizationId: useServerOrganizationId(),
  };
}

/** The choices for page/shelf: the server's automatic choice for these capabilities, the spec pages, and what is in use. */
function usePlacementChoices(auth: CallAuth, caps: { input: string[]; output: string[] } | null, modelId: string | null) {
  const [state, setState] = useState<{
    automatic: Placement | null;
    specPages: string[];
    inUse: Placement[];
    current: Placement | null;
    error: string | null;
    /** The automatic suggestion could not be loaded: said in words, while the saved placement still shows. */
    automaticUnavailable: string | null;
  }>({ automatic: null, specPages: [], inUse: [], current: null, error: null, automaticUnavailable: null });
  const capsKey = JSON.stringify(caps);
  const { baseUrl, accessToken, organizationId } = auth;
  useEffect(() => {
    let alive = true;
    const a: CallAuth = { baseUrl, accessToken, organizationId };
    (async () => {
      try {
        const [defRes, placedRes] = await Promise.allSettled([
          caps ? discoveryApi.defaultPlacement(a, caps) : Promise.resolve(null),
          loadPlacements(modelId ?? undefined),
        ]);
        if (!alive) return;
        const def = defRes.status === "fulfilled" ? defRes.value : null;
        const placed = placedRes.status === "fulfilled" ? placedRes.value : { inUse: [], current: null };
        setState({
          automatic: def ? { page: def.page, shelf: def.shelf, shelf_title: def.shelf_title } : null,
          specPages: def?.spec_pages ?? [],
          inUse: placed.inUse,
          current: placed.current,
          error: placedRes.status === "rejected" ? extractErrorMessage(placedRes.reason) : null,
          automaticUnavailable:
            defRes.status === "rejected"
              ? `The automatic page and shelf could not be worked out (${extractErrorMessage(defRes.reason)}).`
              : null,
        });
      } catch (err) {
        if (alive) setState((p) => ({ ...p, error: extractErrorMessage(err) }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [capsKey, modelId, baseUrl, accessToken, organizationId]);
  return state;
}

export default function DiscoveryContainer() {
  const auth = useAuth();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The row the server just answered for Check: shown at once even before the list re-read has it.
  const [justChecked, setJustChecked] = useState<Candidate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCandidates(await listCandidates());
      setLoadError(null);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    listCandidates()
      .then((rows) => {
        if (alive) setCandidates(rows);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(extractErrorMessage(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  // THE shared discovery view finds the model (search or link); the candidate the server wrote opens below.
  const { baseUrl, accessToken, organizationId } = auth;
  const port = useMemo(
    () =>
      createAdminDiscoveryPort(
        { baseUrl, accessToken, organizationId },
        {
          onCandidate: (row) => {
            setJustChecked(row);
            setSelectedId(row.id);
            void refresh();
          },
          onPromoted: () => void refresh(),
        },
      ),
    [baseUrl, accessToken, organizationId, refresh],
  );

  const selected =
    (candidates ?? []).find((c) => c.id === selectedId) ?? (justChecked?.id === selectedId ? justChecked : null);

  const listWords = listNotice(candidates, loadError);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        {/* The result opens as the selected candidate below (with the admin panels), so the view shows none itself. */}
        <ModelDiscovery port={port} result={null} initialTab="link" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-border">
          {loadError ? <ErrorNotice message={loadError} size="compact" /> : null}
          {listWords ? <p className="p-3 text-sm text-muted-foreground">{listWords}</p> : null}
          {(candidates ?? []).map((c) => {
            const open = (c.suggested?.ambiguities ?? []).length;
            return (
              <Button
                key={c.id}
                variant="quiet"
                onClick={() => setSelectedId(c.id)}
                aria-pressed={selectedId === c.id}
                className="h-auto w-full flex-col items-start gap-1 border-b border-border px-3 py-2 text-left"
              >
                <span className="truncate text-sm font-medium text-foreground">{c.repo}</span>
                <span className="flex gap-1">
                  <Badge variant="outline">{c.state}</Badge>
                  {open ? <Badge variant="destructive">{open} to resolve</Badge> : null}
                </span>
              </Button>
            );
          })}
        </div>
        <div className="min-h-0 overflow-y-auto">
          {selected ? (
            // Its own boundary: a part of the panel that loads lazily never blanks the whole page.
            <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Opening {selected.repo ?? "candidate"}…</p>}>
              <CandidateDetail
                key={detailKey(selected)}
                candidate={selected}
                auth={auth}
                onChanged={refresh}
              />
            </Suspense>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Choose a candidate or paste a link</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateDetail({
  candidate,
  auth,
  onChanged,
}: {
  candidate: Candidate;
  auth: CallAuth;
  onChanged: () => Promise<void>;
}) {
  const s = candidate.suggested;
  const variants = s.variants ?? [];
  const ambiguities = s.ambiguities ?? [];
  const images = (s.media ?? []).filter((m) => m.kind === "image" && m.file_id && m.cdn_url);
  const logo = (s.media ?? []).find((m) => m.kind === "maker_logo");
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(variants.filter((v) => !v.ambiguous).map((v) => v.key)),
  );
  const blockedBecause = promoteBlockedBecause(ambiguities, chosen);
  const [defaultKey, setDefaultKey] = useState<string>(
    () => variants.find((v) => !v.ambiguous)?.key ?? "",
  );
  const [summary, setSummary] = useState(s.summary ?? "");
  const [tags, setTags] = useState((s.tags ?? []).join(", "));
  const [hero, setHero] = useState<string | null>(images[0]?.file_id ?? null);
  const [gallery, setGallery] = useState<Set<string>>(
    () => new Set(images.slice(1).map((m) => m.file_id as string)),
  );
  const [makerId, setMakerId] = useState<string>("");
  const [makers, setMakers] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const choices = usePlacementChoices(auth, s.capabilities ?? null, null);
  const [pickedPlacement, setPickedPlacement] = useState<Placement | null>(null);
  const placement = pickedPlacement ?? choices.automatic;

  useEffect(() => {
    void listMakers()
      .then(setMakers)
      .catch(() => setMakers([]));
  }, []);

  const promote = async (offer: boolean, withoutTest: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await discoveryApi.promote(auth, candidate.id, {
        variant_keys: [...chosen],
        default_variant_key: defaultKey || null,
        provider_id: makerId || null,
        summary,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        hero_file_id: hero,
        thumbnail_file_id: hero,
        gallery_file_ids: [...gallery].filter((id) => id !== hero),
        offer,
        offer_without_test_run: withoutTest,
        // Only a changed placement is sent; otherwise promote chooses by itself.
        ...(placement && choices.automatic && !samePlacement(placement, choices.automatic) ? placement : {}),
      });
      setMessage({
        ok: true,
        text: `Promoted ${result.model_name}: ${result.variants
          .map((v) => `${v.key} ${v.review_state}, files ${v.file_check}`)
          .join("; ")}${result.notes?.length ? `. ${result.notes.join(" ")}` : ""}${
          placement ? `. ${placementWords(placement)}` : ""
        }`,
      });
      await onChanged();
    } catch (err) {
      setMessage({ ok: false, text: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  /** Choose on one version: promote just that version (the form's look and placement as set), and say so. */
  const promoteOne = async (v: LocalVariant): Promise<string> => {
    const result = await discoveryApi.promote(auth, candidate.id, {
      variant_keys: [v.key],
      default_variant_key: v.key,
      provider_id: makerId || null,
      summary,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      hero_file_id: hero,
      thumbnail_file_id: hero,
      gallery_file_ids: [...gallery].filter((id) => id !== hero),
      offer: false,
      ...(placement && choices.automatic && !samePlacement(placement, choices.automatic) ? placement : {}),
    });
    await onChanged();
    return `Promoted ${result.model_name}: ${result.variants.map((x) => `${x.key} ${x.review_state}, files ${x.file_check}`).join("; ")}`;
  };

  return (
    <div className="space-y-5 p-5">
      <header className="flex items-start gap-3">
        {logo?.cdn_url ? (
          <img src={logo.cdn_url} alt={logo.alt} className="h-10 w-10 rounded-md object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-foreground">{s.repo}</h2>
          <p className="text-xs text-muted-foreground">
            Commit {s.revision?.slice(0, 12)} · Maker {s.maker} · License {s.license_id ?? "not stated"}
            {s.gated !== "none" ? ` · Gated (${s.gated})` : ""}
          </p>
        </div>
        <a
          href={s.card_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary"
        >
          Model card <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      {ambiguities.length ? (
        <section className="space-y-2 rounded-md border border-destructive p-3" aria-label="Problems to resolve">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Needs a decision
          </h3>
          {ambiguities.map((a, i) => (
            <div key={i} className="text-sm">
              <Badge variant="destructive" className="mr-2 font-mono">
                {a.code}
              </Badge>
              <span className="text-foreground">{a.words}</span>
              <div className="text-xs text-muted-foreground">
                {a.variant ? `Variant ${a.variant}` : "Whole repository"}
                {a.path ? ` · ${a.path}` : ""}
                {a.detail ? ` · ${a.detail}` : ""}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            A variant with a problem is left out until it is resolved.
          </p>
        </section>
      ) : null}

      {candidate.model_id ? <PromotedPanel modelId={candidate.model_id} auth={auth} caps={s.capabilities ?? null} /> : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Versions</h3>
        <DiscoveryResultView
          result={resultOfCandidate(candidate)}
          device={null}
          runtimes={[]}
          mode="catalog"
          chooseLabel="Promote this version"
          onChoose={(_model, v) => promoteOne(v)}
          renderVariantActions={(v) => {
            const sv = variants.find((x) => x.key === v.key);
            const blocked = sv?.ambiguous ?? false;
            return (
              <>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Checkbox
                    checked={chosen.has(v.key)}
                    disabled={blocked}
                    aria-label={`Include ${v.key}`}
                    onCheckedChange={(on) =>
                      setChosen((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(v.key);
                        else next.delete(v.key);
                        return next;
                      })
                    }
                  />
                  Include
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input type="radio" checked={defaultKey === v.key} onChange={() => setDefaultKey(v.key)} disabled={blocked} /> Default
                </label>
              </>
            );
          }}
        />
        {(s.ignored_files ?? []).length ? (
          <p className="text-xs text-muted-foreground">
            Not part of any version: {s.ignored_files.join(", ")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">How it looks</h3>
        <div className="grid grid-cols-[8rem_1fr] items-center gap-2 text-sm">
          <span className="text-muted-foreground">Maker</span>
          <Select value={makerId || "__auto__"} onValueChange={(v) => setMakerId(v === "__auto__" ? "" : v)}>
            <SelectTrigger className="max-w-xs" aria-label="Maker">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">Match {s.maker}</SelectItem>
              {makers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {s.maker_match && !s.maker_match.matched && !makerId ? (
            <>
              <span />
              <p className="text-xs text-destructive">{s.maker_match.words}</p>
            </>
          ) : null}
          <span className="text-muted-foreground">Summary</span>
          <div className="space-y-1">
            <Textarea aria-label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
            <p className="text-xs text-muted-foreground">
              {s.summary_source ? `From ${s.summary_source}` : "No description on the card; write one"}
            </p>
          </div>
          {s.capabilities ? (
            <>
              <span className="text-muted-foreground">Capabilities</span>
              <p className="text-xs text-foreground">
                {s.capabilities.input.join(" + ")} in, {s.capabilities.output.join(" + ")} out ·{" "}
                <span className="text-muted-foreground">{s.capabilities_basis}</span>
              </p>
            </>
          ) : null}
          <TagsField value={tags} onChange={setTags} />
        </div>
        <div>
          <ImagePicker
            candidateId={candidate.id}
            media={s.media ?? []}
            hero={hero}
            gallery={gallery}
            onHero={setHero}
            onGallery={(id, on) =>
              setGallery((prev) => {
                const next = new Set(prev);
                if (on) next.add(id);
                else next.delete(id);
                return next;
              })
            }
          />
          {(s.media ?? []).filter((m) => m.error).map((m) => (
            <ErrorNotice
              key={m.source_url}
              size="inline"
              message={`Image not copied: ${m.source_url} (${m.error})`}
            />
          ))}
        </div>
      </section>

      {candidate.model_id ? null : (
      <section className="space-y-2" aria-label="Where it shows">
        <h3 className="text-sm font-semibold text-foreground">Where it shows on the Models page</h3>
        {choices.automaticUnavailable ? <ErrorNotice message={choices.automaticUnavailable} size="inline" /> : null}
        {choices.error ? <ErrorNotice message={choices.error} size="inline" /> : null}
        {placement ? (
          <PlacementFields
            value={placement}
            automatic={choices.automatic}
            inUse={choices.inUse}
            specPages={choices.specPages}
            onChange={setPickedPlacement}
            onUseAutomatic={() => setPickedPlacement(null)}
          />
        ) : choices.error ? null : (
          <p className="text-sm text-muted-foreground">Working out the automatic page and shelf…</p>
        )}
      </section>
      )}

      {(s.notes ?? []).length ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {s.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void promote(false, false)} disabled={busy || blockedBecause !== null}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Promote
        </Button>
        <Button
          variant="outline"
          onClick={() => void promote(true, true)}
          disabled={busy || blockedBecause !== null}
        >
          Promote and offer without a test run
        </Button>
        {blockedBecause ? <p className="w-full text-xs text-foreground">{blockedBecause}</p> : null}
        <span className="text-xs text-muted-foreground">Offered untested shows “Not yet tested by us”</span>
        {message ? (
          message.ok ? (
            <p className="w-full text-sm text-foreground">{message.text}</p>
          ) : (
            <div className="w-full">
              <ErrorNotice message={message.text} size="compact" />
            </div>
          )
        ) : null}
      </footer>
    </div>
  );
}

/** A promoted model's page/shelf: shown in words, changeable, saved through the server (ai.model_presentation). */
function PromotedPlacement({
  modelId,
  auth,
  caps,
}: {
  modelId: string;
  auth: CallAuth;
  caps: { input: string[]; output: string[] } | null;
}) {
  const [saved, setSaved] = useState<Placement | null>(null);
  const choices = usePlacementChoices(auth, caps, `${modelId}`);
  const [draft, setDraft] = useState<Placement | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = draft ?? saved ?? choices.current ?? choices.automatic;
  const save = async () => {
    if (!shown) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await discoveryApi.movePlacement(auth, modelId, shown);
      setResult({ ok: true, text: res.words || placementWords(res) });
      setSaved({ page: res.page, shelf: res.shelf, shelf_title: res.shelf_title });
      setDraft(null);
    } catch (err) {
      setResult({ ok: false, text: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };
  if (choices.error && !shown) return <ErrorNotice message={choices.error} size="inline" />;
  if (!shown && choices.automaticUnavailable) return <ErrorNotice message={choices.automaticUnavailable} size="inline" />;
  if (!shown) return <p className="text-xs text-muted-foreground">Reading where it shows…</p>;
  const current = saved ?? choices.current;
  return (
    <div className="space-y-2 border-t border-border pt-2" aria-label="Where it shows on the Models page">
      <h4 className="text-xs font-semibold text-foreground">Where it shows on the Models page</h4>
      {choices.automaticUnavailable ? <ErrorNotice message={choices.automaticUnavailable} size="inline" /> : null}
      <p className="text-xs text-muted-foreground">
        {current ? placementWords(current) : "No page or shelf is saved for this model yet."}
      </p>
      <PlacementFields
        value={shown}
        automatic={choices.automatic}
        inUse={choices.inUse}
        specPages={choices.specPages}
        onChange={setDraft}
        onUseAutomatic={() => setDraft(choices.automatic)}
        saveLabel="Save page and shelf"
        onSave={() => void save()}
        saving={saving}
      />
      {result ? (
        result.ok ? <p className="text-xs text-foreground">{result.text}</p> : <ErrorNotice message={result.text} size="compact" />
      ) : null}
    </div>
  );
}

function PromotedPanel({
  modelId,
  auth,
  caps,
}: {
  modelId: string;
  auth: CallAuth;
  caps: { input: string[]; output: string[] } | null;
}) {
  const [state, setState] = useState<{
    variants: PromotedVariant[];
    runs: VerificationRun[];
    compat: CompatRow[];
    inPublic: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await loadPromoted(modelId));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [modelId]);

  useEffect(() => {
    let alive = true;
    loadPromoted(modelId)
      .then((next) => {
        if (alive) setState(next);
      })
      .catch((err: unknown) => {
        if (alive) setError(extractErrorMessage(err));
      });
    return () => {
      alive = false;
    };
  }, [modelId]);

  const runsByVariant = useMemo(() => {
    const map = new Map<string, VerificationRun[]>();
    for (const r of state?.runs ?? []) {
      if (!r.variant_id) continue;
      map.set(r.variant_id, [...(map.get(r.variant_id) ?? []), r]);
    }
    return map;
  }, [state]);

  // How often and how long the panel re-reads after Run test: knobs ai.models.test_poll_seconds /
  // test_poll_count (no code default; until they resolve the panel does not watch and says so).
  const userId = useAppSelector(selectUserId);
  const orgId = useAppSelector(selectOrganizationId);
  const pollSeconds = useEffectiveKnob(orgId, userId, TEST_POLL_SECONDS_KNOB);
  const pollCount = useEffectiveKnob(orgId, userId, TEST_POLL_COUNT_KNOB);
  const [watchTicks, setWatchTicks] = useState(0);
  const test = async (variantId: string) => {
    setTestMessage(null);
    try {
      const res = await discoveryApi.test(auth, variantId);
      const shown = Boolean(
        describeTestRequest(state?.variants.find((v) => v.id === variantId)?.metadata?.test_request, localTime),
      );
      setTestMessage(describeTestClick(res, shown, localTime));
      if (typeof pollCount === "number") setWatchTicks(pollCount);
      else setTestMessage((m) => `${m ?? ""} The page cannot watch for the result (refresh settings not loaded); reload to see it.`.trim());
      await load();
    } catch (err) {
      setTestMessage(extractErrorMessage(err));
    }
  };

  // After a test request, re-read every test_poll_seconds, test_poll_count times, so the result shows up here.
  useEffect(() => {
    if (watchTicks <= 0 || typeof pollSeconds !== "number") return;
    const id = window.setTimeout(() => {
      setWatchTicks((n) => n - 1);
      void load();
    }, pollSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [watchTicks, load, pollSeconds]);

  if (error) return <ErrorNotice title="The promoted model could not be read" message={error} size="compact" />;
  if (!state) return <p className="text-sm text-muted-foreground">Loading promoted model…</p>;
  return (
    <section className="space-y-2 rounded-md border border-border p-3" aria-label="Promoted model">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckCircle2 className="h-4 w-4" /> In the catalog
        <Badge variant="outline">{state.inPublic ? "Listed in models" : "Not listed"}</Badge>
        {state.inPublic && !state.variants.some((v) => v.review_state === "offered") ? (
          <Badge variant="destructive">Listed although no variant is offered</Badge>
        ) : null}
        {watchTicks > 0 ? <span className="text-xs text-muted-foreground">Watching for the result…</span> : null}
        <Button variant="quiet" onClick={() => void load()}>
          Refresh
        </Button>
      </h3>
      {state.variants.map((v) => {
        const runs = runsByVariant.get(v.id) ?? [];
        const compat = state.compat.filter(
          (c) => c.quant === v.quant && c.architecture === v.architecture && c.chat_template_kind === v.chat_template_kind,
        );
        return (
          <div key={v.id} className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{v.key}</span>
              <Badge variant="outline">{v.review_state}</Badge>
              <Badge variant={v.tested_on_current_runtime ? "default" : "secondary"}>{testedLabel(v)}</Badge>
              {v.is_default ? <Badge variant="outline">Default</Badge> : null}
              <Button variant="outline" onClick={() => void test(v.id)}>
                Run test on cloud machine
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Compatibility:{" "}
              {compat.length ? compat.map(compatLabel).join(" · ") : "none recorded"}
            </div>
            {(() => {
              const line = describeTestRequest(v.metadata?.test_request, localTime);
              if (!line) return null;
              if (line.tone === "error")
                return <ErrorNotice title="Queued test not run" message={line.text} size="compact" />;
              return (
                <div className={line.tone === "info" ? "text-xs text-foreground" : "text-xs text-muted-foreground"}>
                  {line.text}
                </div>
              );
            })()}
            {runs.map((r) => {
              const w = describeRun(r, runs);
              if (w.hideRow) return null; // said once, inside the run it corrects
              return (
                <div key={r.id} className="text-xs text-muted-foreground">
                  <span className={r.result === "fail" && !w.correctedBy ? "text-destructive" : undefined}>
                    {w.headline}
                  </span>
                  {r.finished_at ? ` · ${new Date(r.finished_at).toLocaleString()}` : ""}
                  {w.reason ? <div className="pl-3">{w.reason}</div> : null}
                  {w.correctedBy ? <div className="pl-3 text-foreground">Corrected: {w.correctedBy}</div> : null}
                </div>
              );
            })}
          </div>
        );
      })}
      {testMessage ? <p className="text-xs text-foreground">{testMessage}</p> : null}
      <PromotedPlacement modelId={modelId} auth={auth} caps={caps} />
    </section>
  );
}
