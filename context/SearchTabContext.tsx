// context/SearchTabContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'stays' | 'experiences';

interface SearchTabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  searchFocus: string | null;
  setSearchFocus: (focus: string | null) => void;
}

const SearchTabContext = createContext<SearchTabContextType | undefined>(undefined);

export function SearchTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('stays');
  const [searchFocus, setSearchFocus] = useState<string | null>(null);

  return (
    <SearchTabContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      searchFocus, 
      setSearchFocus 
    }}>
      {children}
    </SearchTabContext.Provider>
  );
}

export function useSearchTab() {
  const context = useContext(SearchTabContext);
  if (context === undefined) {
    throw new Error('useSearchTab must be used within a SearchTabProvider');
  }
  return context;
}