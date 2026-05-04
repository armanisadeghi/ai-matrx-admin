"use client";

/**
 * GalleryWindow — floating window shell for the image gallery.
 *
 * Multi-window pattern: clicking an image opens ImageViewerWindow
 * for full zoom/pan/download. Favorites sidebar tracks liked images.
 */

import React from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { ImageManager } from "@/features/images/components/manager/ImageManager";

interface GalleryWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GalleryWindow({ isOpen, onClose }: GalleryWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Image Gallery"
      id="gallery-window-default"
      minWidth={380}
      minHeight={320}
      width={680}
      height={540}
      onClose={onClose}
      urlSyncKey="gallery"
      urlSyncId="default"
      overlayId="galleryWindow"
    >
      <ImageManager surface="panel" />
    </WindowPanel>
  );
}
