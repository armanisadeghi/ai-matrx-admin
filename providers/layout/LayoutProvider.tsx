// providers/layout/LayoutProvider.tsx

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Section {
    type: 'content';
    content: React.ReactNode;
    defaultSize?: number;
    collapsible?: boolean;
}

interface LayoutOptions {
    header?: {
        show: boolean;
        menuItems?: React.ReactNode[];
    };
    mainSidebar?: {
        show: boolean;
        width: number;
    };
    leftSections?: Section[];
    rightSections?: Section[];
    topSections?: Section[];
    bottomSections?: Section[];
}

interface LayoutContextType {
    options: LayoutOptions;
    updateOptions: (newOptions: Partial<LayoutOptions>) => void;
}

const defaultLayoutOptions: LayoutOptions = {
    header: {
        show: true,
        menuItems: [],
    }
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

export const LayoutProvider: React.FC<{
    children: React.ReactNode;
    initialOptions?: Partial<LayoutOptions>;
}> = ({ children, initialOptions = {} }) => {
    const [options, setOptions] = useState<LayoutOptions>({
        ...defaultLayoutOptions,
        ...initialOptions,
        header: {
            ...defaultLayoutOptions.header,
            ...initialOptions.header
        }
    });

    const updateOptions = useCallback((newOptions: Partial<LayoutOptions>) => {
        setOptions(prev => ({
            ...prev,
            ...newOptions,
            header: newOptions.header ? {
                ...prev.header,
                ...newOptions.header
            } : prev.header
        }));
    }, []);

    return (
        <LayoutContext.Provider value={{ options, updateOptions }}>
            {children}
        </LayoutContext.Provider>
    );
};