"use client";

import React, { useState } from "react";
import { Button } from "@ai-matrx/design-system";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share2, Globe } from "lucide-react";
import { cn } from "@/utils/cn";
import { useSharingStatus } from "@/utils/permissions/hooks";
import type { ResourceType } from "@/utils/permissions/types";
import { ShareModal } from "./ShareModal";

interface ShareButtonProps {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  /** OPTIONAL override — omit it and the modal resolves ownership itself. */
  isOwner?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showStatus?: boolean;
  /** Sizing/spacing override for dense chrome (compact toolbars, header rows). */
  className?: string;
  /**
   * The organization the resource belongs to, for the contact picker — which must
   * offer the people of THIS organization and nobody else (FIX-7B). Passed
   * through to `ShareModal`; omit it and the modal behaves exactly as before.
   */
  organizationId?: string;
}

/**
 * ShareButton - Quick access button to open sharing modal
 *
 * Generic, reusable component that works with ANY resource type.
 * Shows current sharing status and opens the ShareModal.
 *
 * @example
 * <ShareButton
 *   resourceType="note"
 *   resourceId={noteId}
 *   resourceName={note.title}
 * />
 */
export function ShareButton({
  resourceType,
  resourceId,
  resourceName,
  isOwner,
  variant = "outline",
  size = "default",
  showStatus = true,
  className,
  organizationId,
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isPublic, loading, error, refresh } = useSharingStatus(
    resourceType,
    resourceId,
    showStatus,
  );

  // The label is always the ACTION ("Share") — a person scanning for the word
  // must find it. The state rides subtly: the icon (globe once published) and
  // the hover title. Only is_public is checked here (single cheap row query);
  // full detail is inside the modal.
  const getButtonContent = () => {
    if (loading || error) return { icon: Share2, label: "Share", state: "" };
    if (isPublic && showStatus)
      return { icon: Globe, label: "Share", state: "Published to the web" };
    return { icon: Share2, label: "Share", state: "" };
  };

  const { icon: Icon, label, state } = getButtonContent();

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={() => setIsModalOpen(true)}
      className={cn("gap-2", className)}
      title={state ? `${label} · ${state}` : label}
      // An icon-only share control had NO accessible name: a tooltip describes
      // a button, it never names one, so a screen reader announced "button".
      // The label the tooltip shows is the label the button carries.
      aria-label={size === "icon" ? label : undefined}
    >
      <Icon className="w-4 h-4" />
      {size !== "icon" && <span>{label}</span>}
    </Button>
  );

  return (
    <>
      {size === "icon" ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      {isModalOpen && (
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            void refresh();
          }}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceName={resourceName}
          isOwner={isOwner}
          {...(organizationId ? { organizationId } : {})}
        />
      )}
    </>
  );
}
