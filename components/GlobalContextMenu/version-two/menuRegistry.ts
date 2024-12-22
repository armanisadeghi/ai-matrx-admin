/*
// menuRegistry.ts
import { create } from 'zustand';
import { MenuRegistry, ModuleType, MenuItemDefinition } from './types';

interface MenuRegistryStore extends MenuRegistry {
    registerMenu: (definition: MenuItemDefinition) => void;
    registerHandler: (
        menuId: string,
        module: ModuleType,
        handler: Function
    ) => void;
    getHandler: (menuId: string, module: ModuleType) => Function | undefined;
}

export const useMenuRegistry = create<MenuRegistryStore>((set, get) => ({
    definitions: {},
    handlers: {},

    registerMenu: (definition) => set((state) => ({
        definitions: {
            ...state.definitions,
            [definition.id]: definition
        }
    })),

    registerHandler: (menuId, module, handler) => set((state) => ({
        handlers: {
            ...state.handlers,
            [menuId]: {
                ...(state.handlers[menuId] || {}),
                [module]: handler
            }
        }
    })),

    getHandler: (menuId, module) => {
        const handlers = get().handlers[menuId];
        return handlers?.[module];
    }
}));
*/
