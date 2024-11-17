// contexts/FieldActionContext.tsx
import React, {createContext, ReactNode, useContext, useReducer} from 'react';
import {ActionTargetConfig} from "@/components/matrx/Entity/field-actions/types";

interface FieldActionState {
    activeActions: Record<string, {
        id: string;
        content: ReactNode;
        target: ActionTargetConfig;
    }>;
    sections: Record<string, {
        id: string;
        content: ReactNode[];
    }>;
}

type FieldActionContextType = {
    state: FieldActionState;
    registerSection: (id: string) => void;
    renderInSection: (sectionId: string, content: ReactNode, config: ActionTargetConfig) => void;
    clearSection: (sectionId: string) => void;
    removeFromSection: (sectionId: string, contentId: string) => void;
};

export const FieldActionContext = createContext<FieldActionContextType | undefined>(undefined);

