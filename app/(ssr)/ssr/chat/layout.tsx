// app/(ssr)/ssr/chat/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// Chat sidebar toggle driven by #chat-sidebar-toggle checkbox (CSS-only state).
// On mobile: sidebar becomes a fixed drawer with backdrop.
// On desktop: sidebar slides in as a grid column next to the main app sidebar.

import ChatSidebarClient from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';
import ChatShellProviders from './_components/ChatShellProviders';
import ChatSidebarInit from './_components/ChatSidebarInit';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <ChatShellProviders>
            <div className="chat-root">
                {/* CSS-driven toggle — checked = sidebar open.
                    Starts checked for desktop (no flash).
                    ChatSidebarInit unchecks it on mobile to prevent drawer flash. */}
                <input type="checkbox" id="chat-sidebar-toggle" defaultChecked aria-hidden="true" className="sr-only" />
                <ChatSidebarInit />

                {/* Backdrop — mobile only, closes sidebar on tap */}
                <label
                    htmlFor="chat-sidebar-toggle"
                    className="chat-sidebar-backdrop"
                    aria-hidden="true"
                />

                <aside className="chat-sidebar">
                    <ChatSidebarClient />
                </aside>

                <div className="chat-workspace">
                    <ChatWorkspace />
                    <div style={{ display: 'none' }}>{children}</div>
                </div>
            </div>
        </ChatShellProviders>
    );
}
