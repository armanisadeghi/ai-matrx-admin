// app/(ssr)/ssr/chat/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// ChatSidebarClient fetches conversations after mount via /api/cx-chat/history.

import './chat.css';
import ChatSidebarClient from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';

function SidebarSkeleton() {
    return (
        <div>
            <div className="chat-sidebar-header">
                <div className="chat-skeleton-text" style={{ width: '40%', height: '0.875rem' }} />
            </div>
            <div style={{ padding: '0.5rem 0' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="chat-skeleton-item">
                        <div className="chat-skeleton-icon" />
                        <div className="chat-skeleton-text" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="chat-root">
            <aside className="chat-sidebar">
                {/* Renders skeleton instantly, fetches conversations after mount */}
                <ChatSidebarClient />
            </aside>

            <div className="chat-content">
                <ChatWorkspace />
                <div style={{ display: 'none' }}>{children}</div>
            </div>
        </div>
    );
}
