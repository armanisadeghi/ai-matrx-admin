"use client";

import React, { useState, useEffect, useRef } from "react";
import { UniversalPromptEditor } from "../UniversalPromptEditor";
import { normalizePromptData, UniversalPromptData } from "../types";
import { toast } from "sonner";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import { updatePromptBuiltin } from "@/features/prompt-builtins/services/admin-service";
import { useModels } from "@/features/ai-models/hooks/useModels";

interface BuiltinEditorProps {
  builtinId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  initialSelection?: any;
  builtinData?: any;
  /** @deprecated Pass nothing — models come from Redux automatically */
  models?: any[];
  tools?: any[];
}

/**
 * Ready-to-use Builtin Editor Component
 *
 * Handles all CRUD operations for prompt_builtins table internally.
 * Just pass a builtin ID and it does everything.
 *
 * @example
 * ```tsx
 * <BuiltinEditor
 *   builtinId={myBuiltinId}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSaveSuccess={() => console.log('Saved!')}
 * />
 * ```
 */
export function BuiltinEditor({
  builtinId,
  isOpen,
  onClose,
  onSaveSuccess,
  initialSelection,
  builtinData: preloadedBuiltinData,
  tools: preloadedTools,
}: BuiltinEditorProps) {
  const { models } = useModels();
  const [builtinData, setBuiltinData] = useState<UniversalPromptData | null>(
    null,
  );
  const [tools, setTools] = useState<any[]>(preloadedTools || []);
  const [loading, setLoading] = useState(!preloadedBuiltinData);
  const [isSaving, setIsSaving] = useState(false);
  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && builtinId && initializedForId.current !== builtinId) {
      initializedForId.current = builtinId;
      if (preloadedBuiltinData) {
        setBuiltinData(normalizePromptData(preloadedBuiltinData, "builtin"));
        setLoading(false);
      } else {
        loadData();
      }
    }
    if (!isOpen) {
      initializedForId.current = null;
    }
  }, [isOpen, builtinId, preloadedBuiltinData]);

  async function loadData() {
    try {
      setLoading(true);

      const [toolsRes, builtinRes] = await Promise.all([
        fetch("/api/tools")
          .then((r) => r.json())
          .catch(() => ({ tools: [] })),
        fetch(`/api/admin/prompt-builtins/${builtinId}`).then((r) => r.json()),
      ]);

      setTools(toolsRes?.tools || []);

      if (builtinRes && !builtinRes.error) {
        setBuiltinData(normalizePromptData(builtinRes, "builtin"));
      } else {
        toast.error("Builtin not found");
        onClose();
      }
    } catch (error) {
      console.error("Failed to load builtin data:", error);
      toast.error("Failed to load builtin");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(updated: UniversalPromptData) {
    setIsSaving(true);
    try {
      await updatePromptBuiltin({
        id: builtinId,
        name: updated.name,
        description: updated.description ?? undefined,
        messages: updated.messages,
        variableDefaults: updated.variable_defaults ?? undefined,
        settings: updated.settings,
        is_active: updated.is_active,
      });

      toast.success("Builtin saved successfully");
      onSaveSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error("Save failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save builtin",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <MatrxMiniLoader />
      </div>
    );
  }

  if (!builtinData) return null;

  return (
    <UniversalPromptEditor
      isOpen={isOpen}
      onClose={onClose}
      promptData={builtinData}
      models={models}
      availableTools={tools}
      onSave={handleSave}
      isSaving={isSaving}
      initialSelection={initialSelection}
    />
  );
}
