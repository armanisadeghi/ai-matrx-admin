import { DocumentState, EditorBroker } from "@/components/matrx-editor-advanced/types";

// lib/refs/types.ts
export type RefMethod = (...args: any[]) => any;  // Changed from void to any to allow returns

export interface RefCollection {
    [componentId: string]: {
        [methodName: string]: RefMethod;
    };
}

export interface RefManagerMethods {
    call: <T extends any[], R = any>(componentId: string, methodName: string, ...args: T) => R;  // Added return type R
    broadcast: <T extends any[]>(methodName: string, ...args: T) => void;
    hasMethod: (componentId: string, methodName: string) => boolean;
    register: (componentId: string, methods: { [key: string]: RefMethod }) => void;
    unregister: (componentId: string) => void;
}

export interface TextStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    backgroundColor?: string;
}

export interface EditorMethods {
    // Content Management
    getState: () => DocumentState;
    updateContent: (state: DocumentState) => void;
    insertContent: (content: string) => void;
    
    // Selection
    getSelectedText: () => string | null;
    formatSelection: (style: Partial<TextStyle>) => void;
    
    // Broker Management
    insertBroker: (broker: EditorBroker) => void;
    convertToBroker: (broker: EditorBroker) => void;
    
    // Style Management
    getActiveStyles: () => TextStyle;
    resetStyles: () => void;
}

export interface RefManagerMethods {
    call: <T extends any[], R = any>(componentId: string, methodName: string, ...args: T) => R;
    broadcast: <T extends any[]>(methodName: string, ...args: T) => void;
    hasMethod: (componentId: string, methodName: string) => boolean;
    register: (componentId: string, methods: { [key: string]: RefMethod }) => void;
    unregister: (componentId: string) => void;
}
