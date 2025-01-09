// useEditorChips.ts
import { useCallback, useEffect } from 'react';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { ChipData, ChipRequestOptions } from '../types/editor.types';
import { MatrxRecordId } from '@/types';
import { getEditorElement } from '../utils/editorUtils';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';

interface QuickReferenceRecord {
    recordKey: MatrxRecordId;
    displayValue: string;
    metadata?: any;
}

export const useEditorChips = (editorId: string) => {
    const entityKey = 'broker';
    const context = useEditorContext();
    const {quickReferenceRecords} = useFetchQuickRef(entityKey);

    // Validate editor exists when hook is used
    useEffect(() => {
        if (!editorId) {
            throw new Error('useEditorChips requires an editorId');
        }
        
        // Verify the editor element exists in the DOM
        const editor = getEditorElement(editorId);
        if (!editor) {
            console.warn(`Editor element with id ${editorId} not found in DOM`);
        }

        context.registerEditor(editorId);
        return () => context.unregisterEditor(editorId);
    }, [editorId]);

    const editorState = context.getEditorState(editorId);
    const { chipData, colorAssignments } = editorState;

    const createNewChipData = useCallback(
        (requestOptions: ChipRequestOptions = {}): ChipData => {
            return context.createNewChipData(editorId, requestOptions);
        },
        [editorId, context]
    );

    const addChipData = useCallback(
        (data: ChipData) => {
            context.addChipData(editorId, data);
        },
        [editorId, context]
    );

    const removeChipData = useCallback(
        (chipId: string) => {
            context.removeChipData(editorId, chipId);
        },
        [editorId, context]
    );

    const updateChip = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.updateChipData(editorId, chipId, updates);
        },
        [editorId, context]
    );

    const getBrokerChips = useCallback(
        (brokerId: MatrxRecordId) => {
            return chipData.filter(chip => chip.brokerId === brokerId);
        },
        [chipData]
    );

    // Add a helper method to check if a chip exists
    const hasChip = useCallback(
        (chipId: string) => {
            return chipData.some(chip => chip.id === chipId);
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
        hasChip,           // New utility method
        colorAssignments,
    };
};

export type UseEditorChipsResult = ReturnType<typeof useEditorChips>;