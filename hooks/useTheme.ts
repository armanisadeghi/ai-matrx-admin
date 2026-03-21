'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

function getThemeFromDOM(): Theme {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.cookie = `theme=${theme};path=/;max-age=31536000`;
    try { localStorage.setItem('theme', theme); } catch {}
}

// Shared external store so all hook instances stay in sync
let listeners: Array<() => void> = [];
let currentTheme: Theme = typeof document !== 'undefined' ? getThemeFromDOM() : 'dark';

function subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

function getSnapshot() {
    return currentTheme;
}

function getServerSnapshot() {
    return 'dark' as Theme;
}

function notifyListeners() {
    for (const listener of listeners) listener();
}

/**
 * Lightweight theme hook — no provider required.
 * Drop-in replacement for next-themes useTheme().
 * Returns { theme, setTheme, resolvedTheme } for compatibility.
 */
export function useTheme() {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    // Sync from DOM on mount (picks up server-rendered class)
    useEffect(() => {
        const domTheme = getThemeFromDOM();
        if (domTheme !== currentTheme) {
            currentTheme = domTheme;
            notifyListeners();
        }
    }, []);

    const setTheme = useCallback((value: Theme | ((prev: Theme) => Theme)) => {
        const newTheme = typeof value === 'function' ? value(currentTheme) : value;
        if (newTheme === currentTheme) return;
        currentTheme = newTheme;
        applyTheme(newTheme);
        notifyListeners();
    }, []);

    return {
        theme,
        setTheme,
        resolvedTheme: theme,
        systemTheme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    } as const;
}
