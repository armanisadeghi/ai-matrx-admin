'use client';

// ChatSidebarInit — Closes the chat sidebar on mobile after first paint.
// Desktop keeps defaultChecked so the sidebar shows immediately without flash.
// Mobile needs it closed because the drawer would cover the whole screen.

import { useEffect } from 'react';

export default function ChatSidebarInit() {
    useEffect(() => {
        // Close on mobile — drawer mode should start closed
        if (!window.matchMedia('(min-width: 1024px)').matches) {
            const checkbox = document.getElementById('chat-sidebar-toggle') as HTMLInputElement | null;
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
            }
        }
    }, []);

    return null;
}
