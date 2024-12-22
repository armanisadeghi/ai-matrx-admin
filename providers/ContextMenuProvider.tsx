import React, { createContext, useContext, useState, useCallback } from 'react';

export type MenuData = Record<string, unknown>;

type ContextMenuComponent = React.ComponentType<{
    menuData: MenuData;
    onClose: () => void;
}>;

interface ContextMenuContextType {
    getMenuComponent: (type: string) => ContextMenuComponent | null;
    registerMenu: (type: string, component: ContextMenuComponent) => void;
    unregisterMenu: (type: string) => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export interface ContextMenuProviderProps {
    children: React.ReactNode;
}

export const ContextMenuProvider: React.FC<ContextMenuProviderProps> = ({ children }) => {
    const [menus, setMenus] = useState<Record<string, ContextMenuComponent>>({});

    const registerMenu = useCallback((type: string, component: ContextMenuComponent) => {
        setMenus(prev => ({ ...prev, [type]: component }));
    }, []);

    const unregisterMenu = useCallback((type: string) => {
        setMenus(prev => {
            const newMenus = { ...prev };
            delete newMenus[type];
            return newMenus;
        });
    }, []);

    const getMenuComponent = useCallback((type: string) => {
        return menus[type] || null;
    }, [menus]);

    const contextValue = React.useMemo(() => ({
        getMenuComponent,
        registerMenu,
        unregisterMenu,
    }), [getMenuComponent, registerMenu, unregisterMenu]);

    return (
        <ContextMenuContext.Provider value={contextValue}>
            {children}
        </ContextMenuContext.Provider>
    );
};

export const useContextMenu = () => {
    const context = useContext(ContextMenuContext);
    if (!context) {
        throw new Error('useContextMenu must be used within a ContextMenuProvider');
    }
    return context;
};

export const useRegisterContextMenu = (type: string, MenuComponent: ContextMenuComponent) => {
    const { registerMenu, unregisterMenu } = useContextMenu();

    React.useEffect(() => {
        registerMenu(type, MenuComponent);
        return () => unregisterMenu(type);
    }, [type, MenuComponent, registerMenu, unregisterMenu]);
};