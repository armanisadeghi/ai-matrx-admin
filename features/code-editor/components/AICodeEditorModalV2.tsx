// Phase 6 wrapper — replaced in Phase 15
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { useAppDispatch } from "@/lib/redux/hooks";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { getBuiltinId } from "@/lib/redux/prompt-execution/builtins";
import { supabase } from "@/utils/supabase/client";
import type {
  PromptData,
  PromptMessage,
  PromptVariable,
} from "@/features/prompts/types/core";

function asPromptMessages(raw: unknown): PromptMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is PromptMessage =>
      m !== null &&
      typeof m === "object" &&
      "role" in m &&
      typeof (m as { role?: unknown }).role === "string" &&
      "content" in m &&
      typeof (m as { content?: unknown }).content === "string",
  );
}

function asPromptVariables(raw: unknown): PromptVariable[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is PromptVariable =>
      v !== null &&
      typeof v === "object" &&
      "name" in v &&
      typeof (v as { name?: unknown }).name === "string",
  );
}

/**
 * AICodeEditorModalV2
 *
 * Code editor that leverages existing prompt runner infrastructure.
 * Supports multi-turn conversations with automatic code edit detection.
 *
 * Flow:
 * 1. User describes changes
 * 2. AI responds with edits
 * 3. Canvas opens with diff preview
 * 4. User applies changes
 * 5. Conversation continues with updated code
 * 6. Repeat
 */

export interface AICodeEditorModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCode: string;
  language: string;
  builtinId?: string;
  promptKey?:
    | "prompt-app-ui-editor"
    | "generic-code-editor"
    | "code-editor-dynamic-context";
  onCodeChange: (newCode: string) => void;
  selection?: string;
  context?: string;
  title?: string;
  description?: string;
  allowPromptSelection?: boolean;
}

export function AICodeEditorModalV2({
  open,
  currentCode,
  builtinId,
  promptKey = "generic-code-editor",
  selection,
  context,
}: AICodeEditorModalV2Props) {
  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();
  const { close: closeCanvas } = useCanvas();

  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const conversationIdRef = useRef<string | null>(null);

  const defaultBuiltinId = builtinId || getBuiltinId(promptKey);
  const closePrompt = useCallback(() => {
    if (conversationIdRef.current) {
      dispatch(destroyInstanceIfAllowed(conversationIdRef.current));
      conversationIdRef.current = null;
    }
  }, [dispatch]);

  // Fetch builtin prompt when modal opens
  useEffect(() => {
    if (open && !promptData && !hasOpened) {
      setIsLoadingPrompt(true);

      (async () => {
        try {
          const { data: prompt, error } = await supabase
            .from("prompt_builtins")
            .select("*")
            .eq("id", defaultBuiltinId)
            .single();

          if (error || !prompt) {
            console.error("Failed to fetch builtin prompt:", error?.message);
            return;
          }

          const normalizedData: PromptData = {
            id: prompt.id,
            name: prompt.name,
            description: prompt.description,
            messages: asPromptMessages(prompt.messages),
            variableDefaults: asPromptVariables(prompt.variable_defaults),
            settings: prompt.settings || {},
          };

          setPromptData(normalizedData);
        } catch (err) {
          console.error("Error loading builtin prompt:", err);
        } finally {
          setIsLoadingPrompt(false);
        }
      })();
    }
  }, [open, defaultBuiltinId, promptData]);

  // Open the agent runner when prompt data is loaded
  useEffect(() => {
    if (open && promptData && !isLoadingPrompt && !hasOpened) {
      setHasOpened(true);

      (async () => {
        try {
          const result = await launchAgent(defaultBuiltinId, {
            surfaceKey: `code-editor:${defaultBuiltinId}`,
            sourceFeature: "code-editor",
            displayMode: "modal-full",
            autoRun: false,
            allowChat: true,
            showVariables: false,
            usePreExecutionInput: false,
            variables: {
              current_code: currentCode,
              content: currentCode,
              ...(selection && { selection }),
              ...(context && { context }),
            },
          });
          conversationIdRef.current = result.conversationId;
        } catch (error) {
          console.error("Error launching agent:", error);
        }
      })();
    }
  }, [open, promptData, isLoadingPrompt, hasOpened, defaultBuiltinId, currentCode, selection, context, launchAgent]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setPromptData(null);
      setHasOpened(false);
      closePrompt();
      closeCanvas();
    }
  }, [open, closePrompt, closeCanvas]);

  return null;
}
