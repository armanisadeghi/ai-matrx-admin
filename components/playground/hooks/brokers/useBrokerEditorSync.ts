import { useEditorContext } from "@/features/rich-text-editor/provider/EditorProvider";
import { ChipData } from "@/features/rich-text-editor/types/editor.types";
import { useCallback } from "react";


export const useBrokerEditorSync = (brokerId: string) => {
    const context = useEditorContext();
    
    const updateConnectedChips = useCallback((updates: Partial<ChipData>) => {
      context.getVisibleEditors().forEach(editorId => {
        const state = context.getEditorState(editorId);
        state.chipData
          .filter(chip => chip.brokerId === brokerId)
          .forEach(chip => {
            context.updateChipData(chip.id, updates);
          });
      });
    }, [context, brokerId]);
  };
  