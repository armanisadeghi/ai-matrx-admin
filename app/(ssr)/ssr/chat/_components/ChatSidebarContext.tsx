'use client';

// ChatSidebarContext — Manages chat sidebar open/close state.
// Shared between sidebar, header controls, and layout.

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ChatSidebarContextValue {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue>({
    isOpen: false,
    toggle: () => {},
    open: () => {},
    close: () => {},
});

export function useChatSidebar() {
    return useContext(ChatSidebarContext);
}

export function ChatSidebarProvider({ children }: { children: React.ReactNode }) {
    // Start open on desktop, closed on mobile
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
            setIsOpen(true);
        }
    }, []);

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    return (
        <ChatSidebarContext.Provider value={{ isOpen, toggle, open, close }}>
            {children}
        </ChatSidebarContext.Provider>
    );
}
