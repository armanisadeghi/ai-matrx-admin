// app/(ssr)/ssr/chat/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// Sidebar state managed by ChatSidebarContext (React state + Tailwind classes).
// On mobile: sidebar becomes a fixed drawer with backdrop.
// On desktop: sidebar header icons pin permanently to header zone; body slides as a grid column.

import { ChatSidebarHeader, ChatSidebarBody } from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';
import ChatShellProviders from './_components/ChatShellProviders';
import ChatLayoutGrid from './_components/ChatLayoutGrid';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <ChatShellProviders>
            <ChatLayoutGrid
                sidebarHeader={<ChatSidebarHeader />}
                sidebarBody={<ChatSidebarBody />}
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
