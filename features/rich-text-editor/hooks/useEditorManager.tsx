'use client';

import { useCallback, useState, useEffect } from 'react';
import { useEditorContext } from '../provider/EditorProvider';
import { ChipData } from '../types/editor.types';

export const useEditorManager = () => {
    const context = useEditorContext();
    const [editorIds, setEditorIds] = useState<string[]>([]);

    useEffect(() => {
        const findAllEditors = () => {
            const allStates = context.getAllEditorStates();
            const editorsWithState = Object.keys(allStates);
            const editorsWithLayout = context.getEditorsByPosition().map(editor => editor.id);
            return Array.from(new Set([...editorsWithState, ...editorsWithLayout])).sort();
        };

        const interval = setInterval(() => {
            setEditorIds(findAllEditors());
        }, 500);

        return () => clearInterval(interval);
    }, [context]);

    const getAllEditorStates = useCallback(() => {
        return editorIds.map(id => ({
            id,
            state: context.getEditorState(id),
            layout: context.getEditorLayout(id),
            isRegistered: context.isEditorRegistered(id)
        }));
    }, [context, editorIds]);

    const getAllChips = useCallback(() => {
        return editorIds.reduce<Array<ChipData & { editorId: string }>>((chips, id) => {
            const state = context.getEditorState(id);
            return [
                ...chips,
                ...(state.chipData || []).map(chip => ({
                    ...chip,
                    editorId: id
                }))
            ];
        }, []);
    }, [context, editorIds]);

    const getChipsByBroker = useCallback((brokerId: string) => {
        return getAllChips().filter(chip => chip.brokerId === brokerId);
    }, [getAllChips]);

    const getEditorState = useCallback((editorId: string) => {
        return context.getEditorState(editorId);
    }, [context]);

    return {
        editorIds,
        getAllEditorStates,
        getAllChips,
        getChipsByBroker,
        getEditorState,
        // Direct context methods for updates
        updateChipData: context.updateChipData,
        removeChipData: context.removeChipData,
        getEditorLayout: context.getEditorLayout,
        isEditorRegistered: context.isEditorRegistered,
    };
};

export type UseEditorManagerResult = ReturnType<typeof useEditorManager>;