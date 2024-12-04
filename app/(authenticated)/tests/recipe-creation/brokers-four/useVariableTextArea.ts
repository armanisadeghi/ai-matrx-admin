// hooks/useVariableTextArea.ts
import { useState, useCallback, useEffect } from 'react';
import { Variable, TextAreaState } from './';

const VARIABLE_PATTERN = /\{([^}]+)\}!/g;
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
];

export const useVariableTextArea = () => {
    const [state, setState] = useState<TextAreaState>({
        text: '',
        variables: [],
        selectedVariable: null,
    });

    const generateColor = useCallback(() => {
        const usedColors = state.variables.map(v => v.color);
        return COLORS.find(c => !usedColors.includes(c)) || COLORS[0];
    }, [state.variables]);

    const updateVariables = useCallback((newText: string) => {
        const matches = Array.from(newText.matchAll(VARIABLE_PATTERN));
        const newVariables: Variable[] = [];

        matches.forEach((match) => {
            const existingVariable = state.variables.find(
                v => v.value === match[1] && !v.isDeleted
            );

            if (existingVariable) {
                newVariables.push({
                    ...existingVariable,
                    position: {
                        start: match.index!,
                        end: match.index! + match[0].length,
                    },
                });
            } else {
                newVariables.push({
                    id: crypto.randomUUID(),
                    name: match[1],
                    value: match[1],
                    color: generateColor(),
                    position: {
                        start: match.index!,
                        end: match.index! + match[0].length,
                    },
                    isReady: false,
                    isDeleted: false,
                });
            }
        });

        // Mark variables not found in new text as deleted
        const deletedVariables = state.variables
            .filter(v => !newVariables.some(nv => nv.id === v.id))
            .map(v => ({ ...v, isDeleted: true }));

        setState(prev => ({
            ...prev,
            text: newText,
            variables: [...newVariables, ...deletedVariables],
        }));
    }, [state.variables, generateColor]);

    const createVariable = useCallback((name: string, position?: { start: number; end: number }) => {
        const newVariable: Variable = {
            id: crypto.randomUUID(),
            name,
            value: name,
            color: generateColor(),
            position: position || { start: state.text.length, end: state.text.length },
            isReady: false,
            isDeleted: false,
        };

        const newText = position
                        ? state.text
                        : `${state.text}{${name}}!`;

        setState(prev => ({
            ...prev,
            text: newText,
            variables: [...prev.variables, newVariable],
        }));
    }, [state.text, generateColor]);

    const deleteVariable = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            variables: prev.variables.map(v =>
                v.id === id ? { ...v, isDeleted: true } : v
            ),
        }));
    }, []);

    const setVariableReady = useCallback((id: string, isReady: boolean) => {
        setState(prev => ({
            ...prev,
            variables: prev.variables.map(v =>
                v.id === id ? { ...v, isReady } : v
            ),
        }));
    }, []);

    return {
        state,
        updateVariables,
        createVariable,
        deleteVariable,
        setVariableReady,
    };
};
