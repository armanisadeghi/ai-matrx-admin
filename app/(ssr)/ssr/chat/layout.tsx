// app/(ssr)/ssr/chat/layout.tsx
//
// Server component — no async, no auth, no DB. Renders instantly.
//
// Architecture:
//   1. #chat-sidebar-mobile hidden checkbox → CSS-driven mobile drawer toggle.
//      The hamburger in ChatMobileHeaderBar is <label htmlFor="chat-sidebar-mobile">.
//      Opens/closes with zero JS, exactly like the shell's #shell-mobile-menu.
//
//   2. ChatMobileHeaderBar → pure server component, renders on first paint.
//      Users see the full mobile header (hamburger | agent name | new chat)
//      before any JS hydrates. The agent name area is a tiny Suspense island.
//
//   3. ChatShellProviders / ChatLayoutGrid → client providers + desktop grid.
//      Desktop sidebar uses React state for the CSS grid column animation.

import { ChatSidebarHeader, ChatSidebarBody } from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';
import ChatShellProviders from './_components/ChatShellProviders';
import ChatLayoutGrid from './_components/ChatLayoutGrid';
import ChatMobileHeaderBar from './_components/ChatMobileHeaderBar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* CSS checkbox for mobile sidebar drawer — must be inside shell-root
                so .shell-root:has(#chat-sidebar-mobile:checked) selectors work.
                shell-root is the parent of shell-main which is the parent of this layout,
                so it's inside shell-root. Positioned absolutely: takes no layout space. */}
            <input type="checkbox" id="chat-sidebar-mobile" aria-hidden="true" />

            {/* Server-rendered mobile header bar — visible on first paint, zero JS.
                Hamburger labels #chat-sidebar-mobile. New chat is a Link. */}
            <ChatMobileHeaderBar />

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
        </>
    );
}
