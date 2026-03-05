// app/(ssr)/ssr/chat/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// Sidebar state managed by ChatSidebarContext (React state + Tailwind classes).
// On mobile: sidebar becomes a fixed drawer with backdrop.
// On desktop: sidebar slides in as a grid column next to the main app sidebar.

import ChatSidebarClient from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';
import ChatShellProviders from './_components/ChatShellProviders';
import ChatLayoutGrid from './_components/ChatLayoutGrid';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <ChatShellProviders>
            <ChatLayoutGrid
                sidebar={<ChatSidebarClient />}
                workspace={
                    <>
                        <ChatWorkspace />
                        <div style={{ display: 'none' }}>{children}</div>
                    </>
                }
            />
        </ChatShellProviders>
    );
}
