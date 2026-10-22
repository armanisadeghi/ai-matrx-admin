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

import {
  WindowPanel,
  type WindowPanelCloseBinding,
  type WindowPanelProps,
} from "@ai-matrx/summon/window";
import {
  JsonTruncator,
  type JsonTruncatorProps,
  type JsonTruncatorTab,
} from "./JsonTruncator";

/** WindowPanelProps is a discriminated union — one branch requires `overlayId`
 *  (overlay-managed close), the other requires `onClose` (inline-managed
 *  close). This dialog always uses the inline branch (callers control
 *  `isOpen` + `onClose` themselves), so we narrow to that branch before
 *  Omit-ing. Without the Extract, JSX spread inference flips toward the
 *  overlay branch and demands `overlayId`. */
type InlineWindowPanelProps = Extract<
  WindowPanelProps,
  { onClose: () => void }
>;

export interface JsonTruncatorDialogProps
  extends
    JsonTruncatorProps,
    Omit<InlineWindowPanelProps, "children" | "title" | "id" | "onClose" | "overlayId"> {
  isOpen?: boolean;
  onClose: () => void;
  /** The overlay this window renders for. Bound, summon remembers it: back in place after a
   *  same-tab reload, and its last rect per device. Omit for a page-local window. */
  overlayId?: string;
  title?: string;
  id?: string;
  /** Which tab to show when `initialValue` is non-empty. Empty input always
   *  opens on the Input tab regardless of this value. Defaults to "fields". */
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
  id = "json-truncator-window",
  overlayId,
  ...windowProps
}: JsonTruncatorDialogProps) {
  if (isOpen === false) return null;
  const closeBinding: WindowPanelCloseBinding = overlayId
    ? { overlayId, onClose }
    : { onClose };

  return (
    <WindowPanel
      id={id}
      title={title}
      {...closeBinding}
      width={800}
      height={600}
      minWidth={400}
      minHeight={300}
      bodyClassName="p-0 overflow-hidden"
      urlSyncKey="json_truncator"
      urlSyncId="default"
      {...windowProps}
    >
      <JsonTruncator
        initialValue={initialValue}
        tabbed
        defaultTab={defaultTab}
        className="h-full"
        defaultAutoThreshold={defaultAutoThreshold}
        defaultArrayKeep={defaultArrayKeep}
        defaultMaxDepth={defaultMaxDepth}
      />
    </WindowPanel>
  );
}

export default JsonTruncatorDialog;
