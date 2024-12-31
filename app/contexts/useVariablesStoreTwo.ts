// hooks/useVariablesStore.ts
import create from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type InputComponentType = 'Input' | 'Textarea' | 'Select' | 'Switch' | 'Slider' | 'Radio' | 'Checkbox';
export type SourceType = 'userInput' | 'API' | 'Environment' | 'Database' | 'File' | 'Function' | 'Generated' | 'None';
export type VariableMode = 'regular' | 'destructive';

export interface Variable {
    uuid: string;
    displayName: string;
    officialName: string;
    value: string;
    inputComponentType: InputComponentType;
    instructions: string;
    mode: VariableMode;
    isDeleted: boolean;
    isReady: boolean;
    defaultSource: SourceType;
    sourceDetails: string;
}

interface VariablesStore {
    variables: Variable[];
    addVariable: (partial?: Partial<Variable>) => void;
    updateVariable: (uuid: string, updates: Partial<Variable>) => void;
    deleteVariable: (uuid: string) => void;
    restoreVariable: (uuid: string) => void;
    getVariable: (uuid: string) => Variable | undefined;
    getAllVariables: () => Variable[];
}

export const useVariablesStore = create<VariablesStore>((set, get) => ({
    variables: [],

    addVariable: (partial = {}) => {
        const newVariable: Variable = {
            uuid: uuidv4(),
            displayName: partial.displayName || '',
            officialName: partial.officialName || '',
            value: partial.value || '',
            inputComponentType: partial.inputComponentType || 'Input',
            instructions: partial.instructions || '',
            mode: partial.mode || 'regular',
            isDeleted: false,
            isReady: false,
            defaultSource: partial.defaultSource || 'userInput',
            sourceDetails: partial.sourceDetails || '',
        };

        set((state) => ({
            variables: [...state.variables, newVariable],
        }));
    },

    updateVariable: (uuid, updates) => {
        set((state) => ({
            variables: state.variables.map((variable) =>
                variable.uuid === uuid ? { ...variable, ...updates } : variable
            ),
        }));
    },

    deleteVariable: (uuid) => {
        set((state) => ({
            variables: state.variables.map((variable) =>
                variable.uuid === uuid ? { ...variable, isDeleted: true } : variable
            ),
        }));
    },

    restoreVariable: (uuid) => {
        set((state) => ({
            variables: state.variables.map((variable) =>
                variable.uuid === uuid ? { ...variable, isDeleted: false } : variable
            ),
        }));
    },

    getVariable: (uuid) => {
        return get().variables.find((v) => v.uuid === uuid);
    },

    getAllVariables: () => {
        return get().variables;
    },
}));
