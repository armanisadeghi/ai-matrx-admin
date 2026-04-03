"use client";

/**
 * JsonTruncatorDialog
 *
 * Renders JsonTruncator inside a FullScreenOverlay dialog.
 * Accepts the same props as JsonTruncator plus the overlay open/close controls.
 *
 * Usage:
 *   <JsonTruncatorDialog
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     initialValue={JSON.stringify(myObject, null, 2)}
 *   />
 */

import React from "react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import {
  JsonTruncator,
  type JsonTruncatorProps,
  type JsonTruncatorTab,
} from "./JsonTruncator";

export interface JsonTruncatorDialogProps extends JsonTruncatorProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Which tab to show inside the overlay. Defaults to "fields" since the
   *  caller likely pre-loaded data and wants to jump straight to analysis. */
  defaultTab?: JsonTruncatorTab;
}

export function JsonTruncatorDialog({
  isOpen,
  onClose,
  title = "JSON Data Truncator",
  initialValue,
  defaultTab = "fields",
  className,
  defaultAutoThreshold,
  defaultArrayKeep,
  defaultMaxDepth,
}: JsonTruncatorDialogProps) {
  // The overlay requires a tabs array. We hand it a single full-height tab
  // that contains the truncator rendered in tabbed mode so the user can
  // switch between Input / Fields / Output within the overlay.
  const tabs = [
    {
      id: "truncator",
      label: "Truncator",
      content: (
        <JsonTruncator
          initialValue={initialValue}
          tabbed
          defaultTab={defaultTab}
          className="h-full"
          defaultAutoThreshold={defaultAutoThreshold}
          defaultArrayKeep={defaultArrayKeep}
          defaultMaxDepth={defaultMaxDepth}
        />
      ),
      className: "p-0 overflow-hidden",
    },
  ];

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      tabs={tabs}
      hideTitle={false}
      showCancelButton
      cancelButtonLabel="Close"
      onCancel={onClose}
    />
  );
}

export default JsonTruncatorDialog;
