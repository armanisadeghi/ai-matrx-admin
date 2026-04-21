"use client";

import { GlobalMenuItem } from "./types";
import { User, LogOut, Sun, Moon } from "lucide-react";
import React from "react";

class GlobalMenuItemsClass {
    private items: Map<string, () => GlobalMenuItem> = new Map();

    constructor() {
        // Register default global items
        this.register("profile", () => ({
            id: "profile",
            icon: React.createElement(User, { className: "h-4 w-4 mr-2" }),
            label: "Profile Settings",
            onClick: () => {
                if (typeof window !== 'undefined') {
                    window.location.href = '/settings/profile';
                }
            },
            order: 100
        }));

        this.register("theme", () => {
            // Sync engine owns the canonical theme state now. The factory
            // runs outside of React, so we read the pre-paint-applied
            // `data-theme` attribute (set by `SyncBootScript`). The legacy
            // `localStorage.getItem('theme')` fallback is gone — see
            // phase-1b-shim-cleanup.md.
            const isDark = typeof window !== 'undefined' &&
                document.documentElement.getAttribute('data-theme') === 'dark';

            return {
                id: "theme",
                icon: React.createElement(isDark ? Sun : Moon, { className: "h-4 w-4 mr-2" }),
                label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
                onClick: () => {
                    // This will be overridden by the actual menu implementation
                    console.log('Theme toggle placeholder');
                },
                order: 110
            };
        });

        this.register("logout", () => ({
            id: "logout",
            icon: React.createElement(LogOut, { className: "h-4 w-4 mr-2" }),
            label: "Log out",
            onClick: () => {
                // This will be overridden by the actual menu implementation
                console.log('Logout placeholder');
            },
            destructive: true,
            order: 120
        }));
    }

    register(id: string, itemFactory: () => GlobalMenuItem) {
        this.items.set(id, itemFactory);
    }

    get(id: string): GlobalMenuItem | undefined {
        const factory = this.items.get(id);
        return factory ? factory() : undefined;
    }

    getAll(): GlobalMenuItem[] {
        return Array.from(this.items.values())
            .map(factory => factory())
            .sort((a, b) => a.order - b.order);
    }

    exists(id: string): boolean {
        return this.items.has(id);
    }
}

export const GlobalMenuItems = new GlobalMenuItemsClass(); 