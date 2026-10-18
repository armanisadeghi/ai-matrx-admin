"use client";

/**
 * Video clone on a Board: drop a social post link, pick the brand, and the tile IS the Socials clone studio -
 * the reference + brief panels until the clone is planned and generated, then the project studio (script,
 * preview, render, variants, download). The tile saves a REFERENCE (`video-clone` + project id); the project
 * lives in social.video_project like every clone made on the Socials pages. Agents drive the same project with
 * the platform tool `video_clone`.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Clapperboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ai-matrx/design-system/controls";
import { useSurfaceRuntimeRegistration } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

import { Spinner } from "@/components/ui/loaders/Spinner";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { BrandPicker } from "@/features/marketing/components/brands/BrandPicker";
import { getBrand } from "@/features/marketing/data/service";
import { MarketingBrandProvider, useMarketingBrandOptional, type MarketingBrandContextValue } from "@/features/marketing/lib/brand-context";
import { brandKindOf } from "@/features/marketing/lib/brand-kind";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { SocialsContext } from "@/features/marketing/social/components/SocialsContext";
import { CloneWorkspace } from "@/features/marketing/social/components/video/VideoCloneNew";
import { VideoProjectStudio } from "@/features/marketing/social/components/video/VideoProjectStudio";
import { classifySocialLink } from "@/features/marketing/social/link";
import { ingestPost } from "@/features/marketing/social/server";
import { describeSocialFailure } from "@/features/marketing/social/failure";
import { VIDEO_CLONE_SURFACE_NAME, createVideoCloneScope } from "@/features/surfaces/manifests/video-clone.manifest";
import type { NodeSource } from "../board/document";
import { useBoardOrganizationId } from "./board-organization";
import type { BoardItemType, ItemBodyProps, PickerProps } from "./types";

export const VIDEO_CLONE_KEY = "video-clone";

type Meta = Record<string, string>;
const entity = (id: string | null, meta?: Meta): NodeSource => ({ kind: "entity", entity: VIDEO_CLONE_KEY, id, ...(meta ? { meta } : {}) });
const metaOf = (s: NodeSource): Meta => (s.kind === "entity" ? (s.meta ?? {}) : {});

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Add menu: the post link the clone starts from. */
function ClonePicker({ onPick, onCancel }: PickerProps) {
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  const submit = () => {
    const link = classifySocialLink(value);
    if (!link || link.kind !== "post") return setBad(true);
    onPick([{ title: "Video clone", source: entity(null, { url: link.url }) }]);
  };
  return (
    <form className="flex flex-col gap-2 p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="text-sm font-medium text-foreground" htmlFor="video-clone-link">Post to clone</label>
      <input id="video-clone-link" value={value} onChange={(e) => { setValue(e.target.value); setBad(false); }} placeholder="tiktok.com/@name/video/..." aria-invalid={bad} className="h-8 rounded-md border border-border bg-background px-2 text-base text-foreground" />
      {bad ? <p className="text-xs text-destructive">That is not a post link.</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="quiet" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!value.trim()}>Add to board</Button>
      </div>
    </form>
  );
}

/** The studio's providers for one brand: the Socials shell's context, built from the chosen brand. */
function StudioFrame({ brandId, children }: { brandId: string; children: ReactNode }) {
  const inherited = useMarketingBrandOptional();
  const brand = useQuery({ queryKey: ["video-clone-tile", "brand", brandId], queryFn: ({ signal }) => getBrand(brandId, signal), enabled: !inherited || inherited.id !== brandId });
  if (inherited && inherited.id === brandId) return <Frame value={inherited}>{children}</Frame>;
  if (brand.isPending) return <Centered><Spinner size="sm" className="text-muted-foreground" /></Centered>;
  if (!brand.data) return <Centered><span data-error-box>This brand could not be read.<ErrorAlchemyMenu /></span></Centered>;
  const b = brand.data;
  const value: MarketingBrandContextValue = { id: b.id, slug: b.slug, name: b.name, organizationId: b.organization_id, kind: brandKindOf(b), seg: marketingSeg(b) };
  return <Frame value={value}>{children}</Frame>;
}

function Frame({ value, children }: { value: MarketingBrandContextValue; children: ReactNode }) {
  return (
    <MarketingBrandProvider value={value}>
      <SocialsContext.Provider value={{ brandId: value.id, brandSeg: value.seg, organizationId: value.organizationId, openTrack: () => {}, canEdit: true }}>
        <div className="h-full min-h-0 overflow-y-auto bg-textured p-3">{children}</div>
      </SocialsContext.Provider>
    </MarketingBrandProvider>
  );
}

function CloneSurface({ projectId, name, postId }: { projectId: string | null; name: string; postId: string | null }) {
  useSurfaceRuntimeRegistration({
    surfaceName: VIDEO_CLONE_SURFACE_NAME,
    getScope: () => createVideoCloneScope(projectId ? { project_loaded: true, project_id: projectId, name, ...(postId ? { reference_post_id: postId } : {}) } : { project_loaded: false }),
    isEditable: false,
  });
  return null;
}

function VideoCloneBody({ source, title, onSource }: ItemBodyProps) {
  const boardOrg = useBoardOrganizationId();
  const inherited = useMarketingBrandOptional();
  const meta = metaOf(source);
  const projectId = source.kind === "entity" ? source.id : null;
  const [brandId, setBrandId] = useState<string | null>(meta.brand ?? inherited?.id ?? null);
  const [postId, setPostId] = useState<string | null>(meta.post ?? null);
  const [error, setError] = useState<string | null>(null);
  const url = meta.url ?? null;
  const org = inherited?.organizationId ?? boardOrg;

  // The pasted link becomes a stored post (metadata only; the analysis lands the video when the person asks).
  useEffect(() => {
    if (projectId || postId || !url || !org) return;
    let live = true;
    ingestPost({ url, landMedia: false, transcript: false }, { organizationId: org }).then(
      (r) => { if (live) { setPostId(r.post_id); onSource(entity(null, { ...meta, post: r.post_id }), title); } },
      (e: unknown) => { if (live) setError(describeSocialFailure(e, "Could not read that post.").reason); },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, org, projectId, postId]);

  if (!org) return <Centered>This board has no organization yet, so a clone cannot be made for it.</Centered>;
  if (!brandId) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 p-4">
        <p className="text-sm font-medium text-foreground">Which brand is this video for?</p>
        <BrandPicker organizationId={org} value={null} onChange={(id) => { if (id) { setBrandId(id); onSource(entity(projectId, { ...meta, brand: id }), title); } }} label="Brand" />
      </div>
    );
  }
  const surface = <CloneSurface projectId={projectId} name={title} postId={postId} />;
  return (
    <StudioFrame brandId={brandId}>
      {surface}
      {projectId ? (
        <VideoProjectStudio projectId={projectId} />
      ) : error ? (
        <Centered><span data-error-box>{error}<ErrorAlchemyMenu /></span></Centered>
      ) : postId ? (
        <CloneWorkspace postId={postId} projectId={null} onProject={() => {}} base="" onFinished={(id) => onSource(entity(id, { ...meta, brand: brandId, post: postId }), title)} />
      ) : (
        <Centered><Spinner size="sm" className="text-muted-foreground" />Reading the post</Centered>
      )}
    </StudioFrame>
  );
}

export const VIDEO_CLONE_ITEMS: readonly BoardItemType[] = [
  {
    key: VIDEO_CLONE_KEY,
    surface: { name: VIDEO_CLONE_SURFACE_NAME },
    comments: null,
    label: "Video clone",
    kindLabel: "video clone",
    icon: Clapperboard,
    group: "media",
    section: "social",
    accent: "violet",
    status: { none: "A clone's state lives in its studio." },
    defaultSize: { w: 900, h: 720 },
    growOnFill: true,
    matches: (s) => s.kind === "entity" && s.entity === VIDEO_CLONE_KEY,
    Body: VideoCloneBody,
    startNew: { label: "Video clone", icon: Clapperboard, Picker: ClonePicker },
    record: { place: (id, title) => ({ title: title?.trim() || "Video clone", source: entity(id) }) },
  },
];
