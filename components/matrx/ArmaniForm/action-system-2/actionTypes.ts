import React from 'react';

// Types for Action System
export interface ActionConfig {
    id: string;
    triggerConfig?: {
        component: React.ComponentType<any>;
        props?: any;
        position?: 'start' | 'end' | 'top' | 'bottom';
    };
    presentationConfig?: {
        component: React.ComponentType<any>;
        props?: any;
    };
    commandConfig?: {
        handler: (params?: any) => Promise<any> | any;
        params?: any;
    };
    inlineConfig?: {
        component: React.ComponentType<any>;
        props?: any;
    };
}

interface ActionContextType {
    triggerAction: (actionId: string) => void;
    closePresentation: () => void;
    showInline: (config: any) => void;
    hideInline: () => void;
    dispatch: any;
    activePresentation: string | null;
    activeInline: any | null;
}
