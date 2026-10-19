"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ImageIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openImageViewer } from "@/features/overlays/definitions/imageViewer.overlay";
import { ResearchMediaImage, researchMediaViewUrl } from "../media/ownedMedia";
import type { ResearchMedia } from "../../types";

const MAX_IMAGES = 8;
/** Spares in line behind the shown eight, so an image that will not load is
 * replaced by the next one instead of leaving a hole. */
const CANDIDATES = 16;

/**
 * Section d (results of issue #14). Relevant images pulled from the topic,
 * largest first, as a lazy-loaded responsive strip. Clicking an image opens
 * THAT image in the viewer. An image that fails to load is dropped and the
 * next one takes its place; the section is skipped when none load.
 */
export function ResultsMediaBand({
  media,
  topicId,
}: {
  media: ResearchMedia[];
  topicId: string;
}) {
  const images = useMemo(() => {
    return media
      .filter((m) => m.media_type === "image" && m.is_relevant !== false && !!m.url)
      .sort((a, b) => {
        const areaA = (a.width ?? 0) * (a.height ?? 0);
        const areaB = (b.width ?? 0) * (b.height ?? 0);
        return areaB - areaA;
      })
      .slice(0, CANDIDATES);
  }, [media]);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const dispatch = useAppDispatch();
  const shown = images.filter((image) => !failed.has(image.id)).slice(0, MAX_IMAGES);

  if (shown.length === 0) return null;

  const mediaHref = `/research/topics/${topicId}/media`;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-cyan-500" />
          <h2 className="text-lg font-semibold tracking-tight">Rich Media</h2>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 type-meta font-medium text-muted-foreground tabular-nums">
            {shown.length}
          </span>
        </div>
        <Link
          href={mediaHref}
          className="inline-flex items-center gap-1 type-meta font-medium text-primary/80 transition-colors hover:text-primary"
        >
          View all media
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((image, index) => (
          <MediaTile
            key={image.id}
            image={image}
            index={index}
            onOpen={() =>
              openImageViewer(dispatch, {
                images: shown.map(researchMediaViewUrl),
                alts: shown.map((entry) => entry.alt_text || entry.caption || ""),
                initialIndex: index,
                title: "Research images",
              })
            }
            onFailed={() => setFailed((current) => new Set(current).add(image.id))}
          />
        ))}
      </div>
    </section>
  );
}

function MediaTile({
  image,
  index,
  onOpen,
  onFailed,
}: {
  image: ResearchMedia;
  index: number;
  onOpen: () => void;
  onFailed: () => void;
}) {
  const label = image.alt_text || image.caption || "Research image";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: (index % 4) * 0.04, duration: 0.4 }}
      className={cn(
        "group relative aspect-video overflow-hidden rounded-xl border border-border/50 bg-muted/40",
        "transition-colors hover:border-border",
      )}
    >
      {/* Owned uploads resolve from their file_id (a signed URL is a
          handoff, never an identity); discovered images render their source
          URL. Both go through the one renderer. */}
      <ResearchMediaImage
        item={image}
        alt={label}
        onClick={onOpen}
        onError={onFailed}
        className="h-full w-full cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {(image.caption || image.alt_text) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-2 py-1.5 type-meta font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {image.caption || image.alt_text}
        </div>
      )}
    </motion.div>
  );
}
