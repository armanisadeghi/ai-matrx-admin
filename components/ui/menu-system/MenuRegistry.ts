"use client";

import { MenuDefinition } from "./types";

class MenuRegistryClass {
    private menus: Map<string, MenuDefinition> = new Map();

    register(definition: MenuDefinition) {
        this.menus.set(definition.id, definition);
    }

    get(menuId: string): MenuDefinition | undefined {
        return this.menus.get(menuId);
    }

    getAll(): MenuDefinition[] {
        return Array.from(this.menus.values());
    }

    exists(menuId: string): boolean {
        return this.menus.has(menuId);
    }
}

export const MenuRegistry = new MenuRegistryClass(); 