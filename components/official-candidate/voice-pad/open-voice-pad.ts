import {
  closeOverlay,
  openOverlay,
  toggleOverlay,
  DEFAULT_INSTANCE_ID,
} from "@/lib/redux/slices/overlaySlice";
import type { VoicePadVariant } from "@/lib/redux/slices/voicePadSlice";

/**
 * Per-instance voice-pad opener helpers.
 *
 * Three variants:
 *   - "voicePad"          — simple floating pad
 *   - "voicePadAdvanced"  — full pad with history sidebar, footer actions
 *   - "voicePadAi"        — simple pad + AI post-processing (stub)
 *
 * Every variant supports multiple coexisting instances. `instanceId` defaults
 * to "default" for toggle-style callers that expect singleton behavior.
 * Use `openNew*` to spawn a fresh instance while leaving existing ones open.
 */

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const openVoicePad = (instanceId: string = DEFAULT_INSTANCE_ID) =>
  openOverlay({ overlayId: "voicePad", instanceId });

export const toggleVoicePad = (instanceId: string = DEFAULT_INSTANCE_ID) =>
  toggleOverlay({ overlayId: "voicePad", instanceId });

export const openNewVoicePad = () =>
  openOverlay({ overlayId: "voicePad", instanceId: newId() });

export const openVoicePadAdvanced = (
  instanceId: string = DEFAULT_INSTANCE_ID,
) => openOverlay({ overlayId: "voicePadAdvanced", instanceId });

export const toggleVoicePadAdvanced = (
  instanceId: string = DEFAULT_INSTANCE_ID,
) => toggleOverlay({ overlayId: "voicePadAdvanced", instanceId });

export const openNewVoicePadAdvanced = () =>
  openOverlay({ overlayId: "voicePadAdvanced", instanceId: newId() });

export const openVoicePadAi = (instanceId: string = DEFAULT_INSTANCE_ID) =>
  openOverlay({ overlayId: "voicePadAi", instanceId });

export const toggleVoicePadAi = (instanceId: string = DEFAULT_INSTANCE_ID) =>
  toggleOverlay({ overlayId: "voicePadAi", instanceId });

export const openNewVoicePadAi = () =>
  openOverlay({ overlayId: "voicePadAi", instanceId: newId() });

export const closeVoicePadInstance = (
  overlayId: VoicePadVariant,
  instanceId: string,
) => closeOverlay({ overlayId, instanceId });
