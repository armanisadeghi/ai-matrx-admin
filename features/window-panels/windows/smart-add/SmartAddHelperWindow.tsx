"use client";

/**
 * Smart Add helper window — one per people-search method (multi-instance, instance id = method), a
 * "focused session" opened from the Smart Add Helpers menu. The body is the helper panel
 * (features/marketing/smart-add/helpers); the session lives in the helper store, so closing and
 * reopening keeps the search (a running LinkedIn job keeps polling).
 */
import { useEffect } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { HelperPanel } from "@/features/marketing/smart-add/helpers/HelperPanel";
import { resumeLinkedinJob } from "@/features/marketing/smart-add/helpers/store";
import { HELPER_LABELS, type HelperMethod } from "@/features/marketing/smart-add/helpers/types";

interface SmartAddHelperWindowProps {
  method: HelperMethod;
  instanceId: string;
  onClose: () => void;
}

export default function SmartAddHelperWindow({ method, instanceId, onClose }: SmartAddHelperWindowProps) {
  useEffect(() => {
    if (method === "linkedin") resumeLinkedinJob();
  }, [method]);
  return (
    <WindowPanel
      title={HELPER_LABELS[method]}
      id={`smart-add-helper-${method}`}
      minWidth={380}
      minHeight={320}
      width={560}
      height={640}
      position="center"
      onClose={onClose}
      overlayId="smartAddHelperWindow"
      overlayInstanceId={instanceId}
      urlSyncId={method}
      onCollectData={() => ({ method })}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-y-auto p-0"
    >
      <HelperPanel method={method} />
    </WindowPanel>
  );
}
