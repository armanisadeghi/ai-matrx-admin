// useEditorChips.ts
import { useCallback, useEffect } from 'react';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { ChipData, ChipRequestOptions } from '../types/editor.types';
import { MatrxRecordId } from '@/types';

export const useEditorChips = (editorId: string) => {
    const context = useEditorContext();

    // Initialize editor if it doesn't exist
    useEffect(() => {
        context.registerEditor(editorId);
        return () => context.unregisterEditor(editorId);
    }, [editorId]);

    const editorState = context.getEditorState(editorId);
    const { chipData, colorAssignments } = editorState;

    const createNewChipData = useCallback(
        (requestOptions: ChipRequestOptions = {}): ChipData => {
            return context.createNewChipData(editorId, requestOptions);
        },
        [editorId]
    );

    const addChipData = useCallback(
        (data: ChipData) => {
            context.addChipData(editorId, data);
        },
        [editorId]
    );

    const removeChipData = useCallback(
        (chipId: string) => {
            context.removeChipData(editorId, chipId);
        },
        [editorId]
    );

    const updateChip = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.updateChipData(editorId, chipId, updates);
        },
        [editorId]
    );

    const getBrokerChips = useCallback(
        (brokerId: MatrxRecordId) => {
            return chipData.filter(chip => chip.brokerId === brokerId);
        },
        [chipData]
    );

    return {
        chipData,
        createNewChipData,
        addChipData,
        removeChipData,
        updateChip,
        getBrokerChips,
        colorAssignments,
    };
};

export type UseEditorChipsResult = ReturnType<typeof useEditorChips>;