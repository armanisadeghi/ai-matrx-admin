// moduleHeaderContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface HeaderItem {
    id: string;
    component: React.ReactNode;
  priority?: number;
  section?: 'left' | 'right'; // Define which section the item belongs to
}

interface ModuleHeaderContextType {
    addHeaderItem: (item: HeaderItem) => void;
    removeHeaderItem: (id: string) => void;
    headerItems: HeaderItem[];
}

const ModuleHeaderContext = createContext<ModuleHeaderContextType | undefined>(undefined);

export function ModuleHeaderProvider({ children }: { children: React.ReactNode }) {
    const [headerItems, setHeaderItems] = useState<HeaderItem[]>([]);

    const addHeaderItem = useCallback((item: HeaderItem) => {
        setHeaderItems(prev => {
            const filtered = prev.filter(i => i.id !== item.id);
      return [...filtered, { ...item, section: item.section || 'left' }]
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        });
    }, []);

    const removeHeaderItem = useCallback((id: string) => {
        setHeaderItems(prev => prev.filter(item => item.id !== id));
    }, []);

    return (
        <ModuleHeaderContext.Provider value={{ addHeaderItem, removeHeaderItem, headerItems }}>
            {children}
        </ModuleHeaderContext.Provider>
    );
}

export function useModuleHeader() {
    const context = useContext(ModuleHeaderContext);
    if (!context) {
        throw new Error('useModuleHeader must be used within a ModuleHeaderProvider');
    }
    return context;
}

// Hook for easily adding and removing items based on component lifecycle
export function useHeaderItem(id: string, component: React.ReactNode, priority?: number) {
    const { addHeaderItem, removeHeaderItem } = useModuleHeader();

    React.useEffect(() => {
        addHeaderItem({ id, component, priority });
        return () => removeHeaderItem(id);
    }, [id, component, priority, addHeaderItem, removeHeaderItem]);
}