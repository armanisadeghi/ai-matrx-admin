"use client";

// "Publish" — the chart (or one branch) as a public page anyone can open and find: a title, an
// address, a blurb the person writes or asks the blurb job to suggest (org_chart.publish_blurb; an
// idea, never a decision), a preview of what strangers will see, then Publish / Update / Take down
// and Copy link. What is published is a SNAPSHOT (publish/snapshot.ts): names and titles only, never
// emails or record ids. Republishing replaces it in place, so the address stays the same.

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Lightbulb } from "lucide-react";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { useHeadlessAgentJson } from "@ai-matrx/chat/agents/hooks/useHeadlessAgentJson";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { useAgentsById } from "@ai-matrx/chat/agents/identity/agent-catalog-lists";
import { Button, Field } from "@ai-matrx/design-system/controls";

import type { OrgChartTreeNode } from "@/components/official/org-chart/layout";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserFullName, selectUserName } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";

import type { AgentOrgNodeData } from "../buildAgentOrgForest";
import type { OrgPosition } from "../positionsService";
import { loadOrgDirectory, memberForUser } from "../useBoxIdentity";
import { PublishedOrgChart } from "../publish/PublishedOrgChart";
import {
  buildPublishSnapshot,
  countBoxes,
  slugify,
  snapshotOutline,
  type BoxFace,
  type OrgChartSnapshot,
} from "../publish/snapshot";
import { orgChartPublishService, publicationPath, type OrgChartPublication } from "../publish/publishService";

const BLURB_JOB = MANDATE_KEYS.org_chart__publish_blurb;
const BLURB_DISCLOSURE = [{ mandateKey: BLURB_JOB, does: "suggests the title and blurb of a published chart" }] as const;

interface BlurbSuggestion {
  title?: string;
  summary?: string;
  teams?: { name: string; does: string }[];
}

type Directory = Awaited<ReturnType<typeof loadOrgDirectory>>;

export function PublishChartDialog({
  open,
  onClose,
  forest,
  rootBoxId,
  defaultTitle,
  positions,
}: {
  open: boolean;
  onClose: () => void;
  /** The chart exactly as drawn now (the branch's tree when publishing a branch). */
  forest: readonly OrgChartTreeNode<AgentOrgNodeData>[];
  /** The branch's top box id; null for the whole chart. */
  rootBoxId: string | null;
  defaultTitle: string;
  positions: readonly OrgPosition[];
}) {
  const agents = useAgentsById();
  const fullName = useAppSelector(selectUserFullName);
  const shortName = useAppSelector(selectUserName);
  const blurbJob = useHeadlessAgentJson();
  useDeclaredSurfaceMandates(BLURB_DISCLOSURE);
  const { copyText } = useClipboard({ notify: copyNotify });

  const [dir, setDir] = useState<Directory | null>(null);
  const [existing, setExisting] = useState<OrgChartPublication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(slugify(defaultTitle));
  const [slugTouched, setSlugTouched] = useState(false);
  const [blurb, setBlurb] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // The dialog mounts fresh for each publish, so `loaded` starts false; no reset here.
    let live = true;
    void Promise.all([loadOrgDirectory(), orgChartPublishService.findMine(rootBoxId)])
      .then(([d, mine]) => {
        if (!live) return;
        setDir(d);
        setExisting(mine);
        if (mine) {
          setTitle(mine.title);
          setSlug(mine.slug);
          setSlugTouched(true);
          setBlurb(mine.blurb ?? "");
        }
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not read your published pages."))
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [open, rootBoxId]);

  const positionById = new Map(positions.map((p) => [p.id, p]));
  const faceOf = (d: AgentOrgNodeData): BoxFace => {
    switch (d.boxType) {
      case "agent":
        return { name: agents[d.entityId]?.name ?? null, detail: agents[d.entityId]?.description ?? null, avatarUrl: null };
      case "membership": {
        const m = dir?.members.get(d.entityId);
        return { name: m?.name ?? null, detail: null, avatarUrl: m?.avatarUrl ?? null };
      }
      case "team": {
        const t = dir?.teams.get(d.entityId);
        return { name: t?.name ?? null, detail: null, avatarUrl: null };
      }
      case "position": {
        const p = positionById.get(d.entityId);
        const filler = p?.filledByUserId && dir ? memberForUser(dir, p.filledByUserId, p.organizationId) : null;
        return { name: p?.name ?? null, detail: filler ? `Filled by ${filler.name}` : "Open position", avatarUrl: null };
      }
    }
  };
  const snapshot: OrgChartSnapshot = buildPublishSnapshot(forest, faceOf);
  const boxes = countBoxes(snapshot);
  const creatorName = fullName?.trim() || shortName?.trim() || null;
  const address = `${typeof window === "undefined" ? "" : window.location.origin}${publicationPath(slug || slugify(title))}`;

  const suggest = async () => {
    setError(null);
    try {
      const s = await blurbJob.run<BlurbSuggestion>({
        mandateKey: BLURB_JOB,
        surfaceKey: `mandate:${BLURB_JOB}`,
        sourceFeature: "agent-builder",
        expect: "json",
        initiation: "user",
        variables: {
          chart_outline: snapshotOutline(snapshot),
          ...(title.trim() ? { chart_title: title.trim() } : {}),
        },
      });
      if (s.title && (!title.trim() || title === defaultTitle)) {
        setTitle(s.title);
        if (!slugTouched) setSlug(slugify(s.title));
      }
      const teamLines = (s.teams ?? []).map((t) => `${t.name} — ${t.does}`).join("\n");
      const text = [s.summary?.trim(), teamLines].filter(Boolean).join("\n\n");
      if (text) {
        if (!blurb.trim()) setBlurb(text);
        else if (await confirm({ title: "Replace your blurb?", description: "The suggestion replaces what you wrote.", confirmLabel: "Replace" })) setBlurb(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No suggestion came back.");
    }
  };

  const publish = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const input = { title, slug: slug || slugify(title), blurb, rootBoxId, snapshot, creatorName };
      const saved = existing ? await orgChartPublishService.update(existing.id, input) : await orgChartPublishService.publish(input);
      setExisting(saved);
      setSlug(saved.slug);
      toast.success(existing ? "Page updated" : "Published", {
        action: { label: "Open", onClick: () => window.open(publicationPath(saved.slug), "_blank", "noopener") },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!existing || saving) return;
    const ok = await confirm({
      title: "Take this page down?",
      description: "The address stops working for everyone, and its comments are hidden until you publish again.",
      confirmLabel: "Take down",
      variant: "destructive",
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      setExisting(await orgChartPublishService.unpublish(existing.id));
      toast.success("Taken down");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not take it down.");
    } finally {
      setSaving(false);
    }
  };

  const live = Boolean(existing?.published);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rootBoxId ? "Publish this branch" : "Publish the chart"}</DialogTitle>
          <DialogDescription>A public page anyone can open. Names and titles only.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="type-meta font-medium text-muted-foreground">Title</span>
            <ProInput
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              maxLength={120}
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-meta font-medium text-muted-foreground">Address</span>
            {/* ui-exception: a raw value — the page's address */}
            <Field
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              maxLength={80}
              disabled={saving}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="type-meta font-medium text-muted-foreground">Blurb</span>
            <Button variant="outline" icon={<Lightbulb />} disabled={blurbJob.isRunning || saving || boxes === 0} onClick={() => void suggest()}>
              {blurbJob.isRunning ? "Suggesting…" : "Suggest"}
            </Button>
          </div>
          <ProTextarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            placeholder="What this team is and how it works"
            rows={4}
            maxLength={2000}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="type-meta font-medium text-muted-foreground">
            Preview · {boxes} {boxes === 1 ? "box" : "boxes"}
          </span>
          <div className="h-72 overflow-hidden rounded-lg border border-border bg-textured">
            {loaded ? <PublishedOrgChart snapshot={snapshot} title={title || defaultTitle} /> : null}
          </div>
        </div>

        {error && (
          <p className="type-secondary text-destructive">
            {error}
            <ErrorAlchemyMenu />
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {live && existing ? (
              <>
                <Globe className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate type-secondary text-muted-foreground" title={address}>
                  {address}
                </span>
                <Button
                  variant="quiet"
                  icon={<Copy />}
                  aria-label="Copy link"
                  title="Copy link"
                  onClick={() => void copyText(address, "Link copied.", "Couldn't copy — your browser blocked the clipboard.")}
                />
                <Button variant="quiet" icon={<ExternalLink />} aria-label="Open the page" title="Open the page" asChild>
                  <a href={publicationPath(existing.slug)} target="_blank" rel="noopener noreferrer" />
                </Button>
              </>
            ) : (
              <span className="type-secondary text-muted-foreground">{existing ? "Not on the web right now" : "Not published yet"}</span>
            )}
          </div>
          <div className="flex gap-2">
            {live && (
              <Button variant="danger" onClick={() => void unpublish()} disabled={saving}>
                Take down
              </Button>
            )}
            <Button variant="primary" icon={<Globe />} onClick={() => void publish()} disabled={saving || !loaded || !title.trim() || boxes === 0}>
              {saving ? "Saving…" : live ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
