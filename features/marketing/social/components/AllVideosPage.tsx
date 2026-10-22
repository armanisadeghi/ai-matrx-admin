"use client";

/**
 * The cross-brand Videos list under Marketing > Social: every video project across every brand the person can
 * read (the access ladder: never filtered by the active organization). The brand filter defaults to All; each
 * card is the brand Videos tab's own card with the brand named, and opens that brand's project page.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clapperboard, Film } from "lucide-react";

import { Button, EmptyState, RegionSkeleton, Select } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";

import { useAllVideoProjects } from "../video/hooks";
import { ProjectCard } from "./VideosTab";

const ALL = "all";

export function AllVideosPage() {
  const projects = useAllVideoProjects();
  const [brand, setBrand] = useState(ALL);

  const brands = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of projects.data ?? []) byId.set(item.brandId, item.brandName);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects.data]);

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
        line="Open a brand's Videos tab to pick a format, or clone an outlier or swipe-file post"
        action={
          <Button asChild variant="outline">
            <Link href={marketingRoutes.brands()}>Open brands</Link>
          </Button>
        }
      />
    );
  }
  const shown = brand === ALL ? projects.data : projects.data.filter((item) => item.brandId === brand);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Brand"
          value={brand}
          options={[{ value: ALL, label: "All brands" }, ...brands.map(([id, name]) => ({ value: id, label: name }))]}
          onValueChange={setBrand}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shown.map((item) => (
          <ProjectCard
            key={item.project.id}
            item={item}
            brandName={item.brandName}
            href={`${marketingRoutes.brandSocials(item.brandId)}/videos/${item.project.id}`}
          />
        ))}
      </div>
    </div>
  );
}
