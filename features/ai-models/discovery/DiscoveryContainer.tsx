"use client";

// features/ai-models/discovery/DiscoveryContainer.tsx
//
// AI Models › Discovery (unified models P1): paste a Hugging Face link → a checked candidate with
// its variants, files, signature, license, fit and proposed media → the admin picks → promote →
// a test run on the cloud test machine → offered. Ambiguities stop with their code shown in words.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ScanSearch } from "lucide-react";

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
import { Input } from "@ai-matrx/design-system/controls";
import { formatFileSize } from "@ai-matrx/kit/format";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { extractErrorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";
import {
  type Candidate,
  type CallAuth,
  type CompatRow,
  type PromotedVariant,
  type SuggestedVariant,
  type VerificationRun,
  discoveryApi,
  listCandidates,
  listMakers,
  loadPromoted,
  testedLabel,
} from "./api";

const USE_LABEL: Record<string, string> = {
  core: "Always",
  vision: "Images",
  audio_in: "Audio",
  voices: "Voices",
};

function short(sha: string | null): string {
  return sha ? `${sha.slice(0, 12)}…` : "none";
}

function bytes(n: number | null | undefined): string {
  return n ? formatFileSize(n) : "—";
}

function useAuth(): CallAuth {
  return {
    accessToken: useAppSelector(selectAccessToken) ?? null,
    baseUrl: useAppSelector(selectResolvedBaseUrl) ?? null,
    organizationId: useServerOrganizationId(),
  };
}

export default function DiscoveryContainer() {
  const auth = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const resolve = async () => {
    if (!link.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const row = await discoveryApi.resolve(auth, link.trim());
      await refresh();
      setSelectedId(row.id);
      setLink("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ScanSearch className="h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Hugging Face link"
          placeholder="Paste a Hugging Face model link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void resolve();
          }}
          className="max-w-xl"
        />
        <Button onClick={() => void resolve()} disabled={busy || !link.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Reading files…" : "Check"}
        </Button>
        {error ? <ErrorNotice message={error} size="inline" /> : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-border">
          {loadError ? <ErrorNotice message={loadError} size="compact" /> : null}
          {candidates.length === 0 && !loadError ? (
            <p className="p-3 text-sm text-muted-foreground">No candidates yet</p>
          ) : null}
          {candidates.map((c) => {
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
            <CandidateDetail
              key={selected.id + selected.updated_at}
              candidate={selected}
              auth={auth}
              onChanged={refresh}
            />
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
  const images = (s.media ?? []).filter((m) => m.kind === "image" && m.file_id);
  const logo = (s.media ?? []).find((m) => m.kind === "maker_logo");
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(variants.filter((v) => !v.ambiguous).map((v) => v.key)),
  );
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
      });
      setMessage({
        ok: true,
        text: `Promoted ${result.model_name}: ${result.variants
          .map((v) => `${v.key} ${v.review_state}, files ${v.file_check}`)
          .join("; ")}`,
      });
      await onChanged();
    } catch (err) {
      setMessage({ ok: false, text: extractErrorMessage(err) });
    } finally {
      setBusy(false);
    }
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

      {candidate.model_id ? <PromotedPanel modelId={candidate.model_id} auth={auth} /> : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Variants</h3>
        {variants.length === 0 ? <p className="text-sm text-muted-foreground">None found</p> : null}
        {variants.map((v) => (
          <VariantCard
            key={v.key}
            v={v}
            checked={chosen.has(v.key)}
            isDefault={defaultKey === v.key}
            onCheck={(on) =>
              setChosen((prev) => {
                const next = new Set(prev);
                if (on) next.add(v.key);
                else next.delete(v.key);
                return next;
              })
            }
            onDefault={() => setDefaultKey(v.key)}
          />
        ))}
        {(s.ignored_files ?? []).length ? (
          <p className="text-xs text-muted-foreground">
            Not part of any variant: {s.ignored_files.join(", ")}
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
          <span className="text-muted-foreground">Summary</span>
          <Textarea aria-label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
          <span className="text-muted-foreground">Tags</span>
          <Input aria-label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Images are copied into our file storage. Pick the main image and which others to keep.
          </p>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images on the model card; the maker logo shows instead</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {images.map((m) => (
              <figure key={m.file_id} className="w-36 space-y-1">
                <img
                  src={m.cdn_url ?? ""}
                  alt={m.alt}
                  className={cn(
                    "h-24 w-36 rounded-md border object-cover",
                    hero === m.file_id ? "border-primary" : "border-border",
                  )}
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={`hero-${candidate.id}`}
                    checked={hero === m.file_id}
                    onChange={() => setHero(m.file_id)}
                  />
                  Main image
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={gallery.has(m.file_id as string) || hero === m.file_id}
                    disabled={hero === m.file_id}
                    onCheckedChange={(on) =>
                      setGallery((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(m.file_id as string);
                        else next.delete(m.file_id as string);
                        return next;
                      })
                    }
                  />
                  Keep
                </label>
              </figure>
            ))}
          </div>
          {(s.media ?? []).filter((m) => m.error).map((m) => (
            <ErrorNotice
              key={m.source_url}
              size="inline"
              message={`Image not copied: ${m.source_url} (${m.error})`}
            />
          ))}
        </div>
      </section>

      {(s.notes ?? []).length ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {s.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void promote(false, false)} disabled={busy || chosen.size === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Promote
        </Button>
        <Button
          variant="outline"
          onClick={() => void promote(true, true)}
          disabled={busy || chosen.size === 0}
        >
          Promote and offer without a test run
        </Button>
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

function VariantCard({
  v,
  checked,
  isDefault,
  onCheck,
  onDefault,
}: {
  v: SuggestedVariant;
  checked: boolean;
  isDefault: boolean;
  onCheck: (on: boolean) => void;
  onDefault: () => void;
}) {
  return (
    <div className={cn("rounded-md border p-3", v.ambiguous ? "border-destructive" : "border-border")}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 font-medium text-foreground">
          <Checkbox checked={checked} disabled={v.ambiguous} onCheckedChange={(on) => onCheck(Boolean(on))} />
          {v.key}
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="radio" checked={isDefault} onChange={onDefault} disabled={v.ambiguous} /> Default
        </label>
        <Badge variant="outline">{v.format}</Badge>
        <Badge variant="outline">{v.quant || "quant ?"}</Badge>
        <Badge variant="outline">{v.architecture || "architecture ?"}</Badge>
        <Badge variant="outline" title={v.chat_template_kind || "no chat template"}>
          {v.chat_template_kind ? `template ${v.chat_template_kind.slice(4, 12)}` : "no template"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {bytes(v.total_bytes)} · needs about {bytes(v.memory_bytes_min)}–{bytes(v.memory_bytes_recommended)} memory
          (estimate)
        </span>
      </div>
      <table className="mt-2 w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 font-normal">File</th>
            <th className="pr-2 font-normal">Role</th>
            <th className="pr-2 font-normal">Needed</th>
            <th className="pr-2 font-normal">Size</th>
            <th className="font-normal">SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {v.artifacts.map((a) => (
            <tr key={a.path_in_repo} className="border-t border-border">
              <td className="py-1 pr-2 font-mono text-foreground">{a.path_in_repo}</td>
              <td className="pr-2">
                {a.role}
                {a.shard_index ? ` ${a.shard_index}/${a.shard_count}` : ""}
              </td>
              <td className="pr-2">
                {a.required_for.length ? a.required_for.map((u) => USE_LABEL[u] ?? u).join(", ") : "Optional"}
              </td>
              <td className="pr-2">{bytes(a.size_bytes)}</td>
              <td className="font-mono" title={a.sha256 ?? ""}>
                {short(a.sha256)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotedPanel({ modelId, auth }: { modelId: string; auth: CallAuth }) {
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

  const test = async (variantId: string) => {
    setTestMessage(null);
    try {
      const res = await discoveryApi.test(auth, variantId);
      setTestMessage(
        res.status === "dispatched"
          ? "Test started on the cloud test machine; it takes several minutes"
          : "A test is already running",
      );
    } catch (err) {
      setTestMessage(extractErrorMessage(err));
    }
  };

  if (error) return <ErrorNotice title="The promoted model could not be read" message={error} size="compact" />;
  if (!state) return <p className="text-sm text-muted-foreground">Loading promoted model…</p>;
  return (
    <section className="space-y-2 rounded-md border border-border p-3" aria-label="Promoted model">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckCircle2 className="h-4 w-4" /> In the catalog
        <Badge variant="outline">{state.inPublic ? "Listed in models" : "Not listed"}</Badge>
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
              {compat.length
                ? compat.map((c) => `${c.hardware_class} ${c.status}`).join(" · ")
                : "none recorded"}
            </div>
            {runs.map((r) => (
              <div key={r.id} className="text-xs text-muted-foreground">
                {r.check_kind} · {r.result}
                {r.hardware_class ? ` · ${r.os}/${r.arch} ${r.hardware_class}` : ""}
                {typeof r.measured?.tokens_per_second === "string" && r.measured.tokens_per_second
                  ? ` · ${r.measured.tokens_per_second} tokens/s`
                  : ""}
                {r.finished_at ? ` · ${new Date(r.finished_at).toLocaleString()}` : ""}
              </div>
            ))}
          </div>
        );
      })}
      {testMessage ? <p className="text-xs text-foreground">{testMessage}</p> : null}
    </section>
  );
}
