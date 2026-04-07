"use client";

import React, { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/features/window-panels/WindowPanel";
import AiVoiceFloatingWorkspace from "@/features/audio/voice/AiVoiceFloatingWorkspace";

export interface AiVoiceWindowProps extends Omit<
  WindowPanelProps,
  "children" | "title"
> {
  title?: string;
  instanceId?: string;
}

export function AiVoiceWindow({
  title = "AI Voice Pad",
  id = "aiVoiceWindow",
  instanceId = "default",
  ...windowProps
}: AiVoiceWindowProps) {
  const dispatch = useAppDispatch();

  const onClose = useCallback(() => {
    dispatch(closeOverlay({ overlayId: id, instanceId }));
  }, [dispatch, id, instanceId]);

  return (
    <WindowPanel
      id={id}
      title={title}
      onClose={onClose}
      minWidth={360}
      minHeight={400}
      width={480}
      height={600}
      urlSyncKey="aiVoiceWindow"
      urlSyncId={instanceId}
      {...windowProps}
    >
      <AiVoiceFloatingWorkspace />
    </WindowPanel>
  );
}

export default AiVoiceWindow;
