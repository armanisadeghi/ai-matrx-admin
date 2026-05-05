"use client";

import { TabbedGalleryModal } from "./TabbedGalleryModal";
import { MediaTab } from "./MediaTab";
import { LinksTab } from "./LinksTab";
import { DocsTab } from "./DocsTab";
import { GalleryToolbar } from "./GalleryToolbar";
import { useWhatsAppMedia } from "../../hooks/useWhatsAppMedia";
import type { GalleryTab } from "../../types";

interface MediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaModal({ open, onOpenChange }: MediaModalProps) {
  const { media, links, docs } = useWhatsAppMedia();

  const tabs: GalleryTab[] = [
    {
      id: "media",
      label: "Media",
      count: media.length,
      content: () => <MediaTab items={media} />,
    },
    {
      id: "links",
      label: "Links",
      count: links.length,
      content: () => <LinksTab items={links} />,
    },
    {
      id: "docs",
      label: "Docs",
      count: docs.length,
      content: () => <DocsTab items={docs} />,
    },
  ];

  return (
    <TabbedGalleryModal
      open={open}
      onOpenChange={onOpenChange}
      title="Media"
      subtitle={`${subtitle(tabs)} from all chats`}
      tabs={tabs}
      initialTabId="media"
      toolbarSlot={<GalleryToolbar />}
      footer={{ primaryLabel: "Done" }}
    />
  );
}

function subtitle(tabs: GalleryTab[]): string {
  return "Media";
}
