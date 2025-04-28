// context/AppletDataContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type TabType = "stays" | "experiences";

interface AppletDataContextType {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    searchFocus: string | null;
    setSearchFocus: (focus: string | null) => void;
    isMobile: boolean; // Include isMobile in the context type
}

const AppletDataContext = createContext<AppletDataContextType | undefined>(undefined);

export function AppletDataProvider({
    children,
    isMobile = false, // Default to false if not provided
}: {
    children: ReactNode;
    isMobile?: boolean;
}) {
    const [activeTab, setActiveTab] = useState<TabType>("stays");
    const [searchFocus, setSearchFocus] = useState<string | null>(null);

    return (
        <AppletDataContext.Provider
            value={{
                activeTab,
                setActiveTab,
                searchFocus,
                setSearchFocus,
                isMobile,
            }}
        >
            {children}
        </AppletDataContext.Provider>
    );
}

export function useAppletData() {
    const context = useContext(AppletDataContext);
    if (context === undefined) {
        throw new Error("useAppletData must be used within a AppletDataProvider");
    }
    return context;
}
