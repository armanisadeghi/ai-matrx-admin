"use client";

/**
 * Socials → Videos: the brand's video projects (clones of outlier and swipe posts). Each card opens
 * the project's studio. A project is made from a post's "Clone" / "Clone with 3 variants".
 */

import Link from "next/link";
import { Clapperboard, Film, TrendingUp } from "lucide-react";

import { Badge, Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";

import { relativeAge } from "../mappers";
import { postThumbnailDoor } from "../server";
import { useBrandVideoProjects } from "../video/hooks";
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
  if (projects.data.length === 0) {
    return (
      <EmptyState
        icon={<Clapperboard />}
        title="No videos yet"
        line="Clone any outlier or swipe-file post"
        action={
          <Button asChild variant="primary" icon={<TrendingUp />}>
            <Link href={`${marketingRoutes.brandSocials(brandSeg)}/outliers`}>Open outliers</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {projects.data.map((item) => (
        <ProjectCard key={item.project.id} item={item} href={`${base}/${item.project.id}`} />
      ))}
    </div>
  );
}

function ProjectCard({ item, href }: { item: VideoProjectListItem; href: string }) {
  const { project } = item;
  return (
    <Link href={href} data-clickable className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card">
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
        <div className="flex items-center gap-1.5">
          <Badge tone={project.head_version > 0 ? "neutral" : "warning"}>{project.head_version > 0 ? `v${project.head_version}` : "Needs analysis"}</Badge>
          {item.variantCount > 0 ? <Badge>{`${item.variantCount} variants`}</Badge> : null}
          <span className="type-meta ml-auto text-muted-foreground">{relativeAge(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
