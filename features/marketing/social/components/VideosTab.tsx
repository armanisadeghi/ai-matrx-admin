"use client";

/**
 * Socials → Videos: the brand's video projects (clones of outlier and swipe posts). Each card opens
 * the project's studio. A project is made from a post's "Clone" / "Clone with 3 variants".
 */

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Film, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "@/lib/toast";

import { Badge, Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { marketingRoutes } from "@/features/marketing/lib/routes";

import { relativeAge } from "../mappers";
import { postThumbnailDoor } from "../server";
import { useBrandVideoProjects, videoKeys } from "../video/hooks";
import { deleteVideoProject } from "../video/server";
import type { VideoProjectListItem } from "../video/types";
import { useSocials } from "./SocialsContext";
import { SocialImage } from "./SocialImage";

export function VideosTab() {
  const { brandSeg } = useSocials();
  const projects = useBrandVideoProjects();
  const base = `${marketingRoutes.brandSocials(brandSeg)}/videos`;

  if (projects.isPending) return <RegionSkeleton shape="cards" count={6} aria-label="Loading videos" />;
  if (projects.isError) {
    return (
      <EmptyState
        icon={<Film />}
        title="Couldn't load videos"
        line={<ErrorAlchemyMenu error={projects.error} />}
        action={<Button onClick={() => void projects.refetch()}>Retry</Button>}
      />
    );
  }
  const newVideo = (
    <Button asChild variant="primary" icon={<Plus />}>
      <Link href={`${base}/formats`}>New video</Link>
    </Button>
  );
  if (projects.data.length === 0) {
    return (
      <EmptyState
        icon={<Clapperboard />}
        title="No videos yet"
        line="Pick a format, or clone any outlier or swipe-file post"
        action={
          <div className="flex items-center gap-2">
            {newVideo}
            <Button asChild variant="outline" icon={<TrendingUp />}>
              <Link href={`${marketingRoutes.brandSocials(brandSeg)}/outliers`}>Open outliers</Link>
            </Button>
          </div>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center">{newVideo}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {projects.data.map((item) => (
          <ProjectCard key={item.project.id} item={item} href={`${base}/${item.project.id}`} />
        ))}
      </div>
    </div>
  );
}

/** One video card. Shared by the brand Videos tab and the cross-brand Videos page (which adds `brandName`). */
export function ProjectCard({ item, href, brandName }: { item: VideoProjectListItem; href: string; brandName?: string }) {
  const { project } = item;
  const queryClient = useQueryClient();
  const remove = async () => {
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      description: "The video and its versions leave your list. Files already made stay in your library.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteVideoProject(project.id, { organizationId: project.organization_id });
      await queryClient.invalidateQueries({ queryKey: videoKeys.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this video");
    }
  };
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link href={href} data-clickable className="flex flex-col">
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
          <SocialImage
            door={item.postId && item.hasStoredThumbnail ? postThumbnailDoor(item.postId) : null}
            url={item.thumbnailUrl}
            fallback={<Film className="m-auto size-6 text-muted-foreground" />}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-1 p-2">
          <span className="type-label truncate text-foreground">{project.name}</span>
          {brandName ? <span className="type-meta truncate text-muted-foreground">{brandName}</span> : null}
          <div className="flex items-center gap-1.5">
            <Badge tone={project.head_version > 0 ? "neutral" : "warning"}>{project.head_version > 0 ? `v${project.head_version}` : "Not planned yet"}</Badge>
            {item.variantCount > 0 ? <Badge>{`${item.variantCount} variants`}</Badge> : null}
            <span className="type-meta ml-auto text-muted-foreground">{relativeAge(project.updated_at)}</span>
          </div>
        </div>
      </Link>
      <Button variant="quiet" aria-label={`Delete ${project.name}`} icon={<Trash2 />} className="absolute right-1 top-1 bg-card/80" onClick={() => void remove()} />
    </div>
  );
}
