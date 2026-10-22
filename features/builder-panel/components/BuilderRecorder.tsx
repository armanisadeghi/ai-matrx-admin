"use client";

/**
 * BuilderRecorder — the Builder's recorder alone, no button. Renders nothing; keeps pages publishing
 * to the Builder feed (and the request log recording) while an admin has debug mode on. The classic
 * sidebar records through SidebarBuilderToggle; the app frame mounts this instead, behind the same
 * gate (FrameBuilderRecorder). One hook, `useBuilderRecording`, serves both.
 */

import { useBuilderRecording } from "../hooks/useBuilderRecording";

export default function BuilderRecorder() {
  useBuilderRecording();
  return null;
}
