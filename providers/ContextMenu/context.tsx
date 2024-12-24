'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { MenuConfig, MenuItem } from './types';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface MenuContextState {
    menus: Map<string, MenuConfig>;
}

interface MenuContextValue extends MenuContextState {
    registerMenu: (config: MenuConfig) => void;
    updateMenu: (id: string, items: MenuItem[]) => void;
    getMenu: (id: string) => MenuConfig | undefined;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({
    children,
    defaultMenus = []
}: {
    children: React.ReactNode;
    defaultMenus?: MenuConfig[];
}) {
    const [state, setState] = useState<MenuContextState>(() => ({
        menus: new Map(defaultMenus.map(menu => [menu.id, menu]))
    }));

    const registerMenu = useCallback((config: MenuConfig) => {
        setState(prev => ({
            ...prev,
            menus: new Map(prev.menus).set(config.id, config)
        }));
    }, []);

    const updateMenu = useCallback((id: string, items: MenuItem[]) => {
        setState(prev => {
            const menus = new Map(prev.menus);
            const existing = menus.get(id);
            if (existing) {
                menus.set(id, { ...existing, items });
            }
            return { ...prev, menus };
        });
    }, []);

    const getMenu = useCallback((id: string) => {
        return state.menus.get(id);
    }, [state.menus]);

    return (
        <MenuContext.Provider value={{
            ...state,
            registerMenu,
            updateMenu,
            getMenu
        }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
}

