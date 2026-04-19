"use client";

/**
 * AgentMicrophoneButton
 *
 * Thin wrapper around the official <MicrophoneIconButton> that knows how to
 * deliver a transcript into the agent input for a given conversation. The
 * official mic button owns everything voice-related (permissions, chunked
 * Whisper streaming, recovery toast, error toast, recording modal, lazy
 * load of the recorder chunk) — this component just connects its output
 * to Redux.
 *
 * Behaviour:
 *   1. Renders nothing heavy until the user clicks the mic. Under the hood
 *      the button is a plain lucide icon; on first click it dynamically
 *      imports the recorder core. Page-load cost is a single icon.
 *   2. When a final transcript arrives, append it to the current
 *      `userInputText` for this conversation (newline-separated if text was
 *      already present) and flag a pending auto-submit.
 *   3. Once the updated input text has landed in the store and the
 *      conversation isn't already executing, dispatch `smartExecute` —
 *      preserves the existing "speak then it just sends" UX.
 *
 * No consumer props beyond `conversationId` and optional layout knobs are
 * required. All other wiring (voice preferences, transcription service,
 * permissions) happens inside MicrophoneIconButton.
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import type { MicVariant } from "@/features/audio/components/MicrophoneIconButton";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { selectIsExecuting } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { smartExecute } from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";

interface AgentMicrophoneButtonProps {
  conversationId: string;
  surfaceKey?: string;
  disableSend?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: MicVariant;
  className?: string;
}

export function AgentMicrophoneButton({
  conversationId,
  surfaceKey,
  disableSend = false,
  size = "sm",
  variant = "icon-only",
  className,
}: AgentMicrophoneButtonProps) {
  const dispatch = useAppDispatch();

  const inputText = useAppSelector(selectUserInputText(conversationId));
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
  const currentUserValues = useAppSelector(
    (state) =>
      state.instanceVariableValues.byConversationId[conversationId]
        ?.userValues ?? {},
  );

  /** Set by onTranscriptionComplete; cleared once the follow-up submit fires. */
  const pendingSubmitRef = useRef(false);

  useEffect(() => {
    if (
      !pendingSubmitRef.current ||
      !inputText.trim() ||
      isExecuting ||
      disableSend
    ) {
      return;
    }
    pendingSubmitRef.current = false;
    // Tiny delay lets the setUserInputText reducer commit so smartExecute
    // reads the latest text when it assembles the outgoing message.
    const t = setTimeout(() => {
      dispatch(smartExecute({ conversationId, surfaceKey }));
    }, 50);
    return () => clearTimeout(t);
  }, [inputText, isExecuting, disableSend, conversationId, surfaceKey, dispatch]);

  const handleTranscriptionComplete = useCallback(
    (text: string) => {
      if (!text) return;
      const next = inputText ? `${inputText}\n${text}` : text;
      pendingSubmitRef.current = true;
      dispatch(
        setUserInputText({
          conversationId,
          text: next,
          userValues: currentUserValues,
        }),
      );
    },
    [inputText, currentUserValues, conversationId, dispatch],
  );

  return (
    <MicrophoneIconButton
      variant={variant}
      size={size}
      className={className}
      onTranscriptionComplete={handleTranscriptionComplete}
    />
  );
}
