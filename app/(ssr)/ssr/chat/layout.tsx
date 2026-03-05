// app/(ssr)/ssr/chat/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// ChatSidebarClient fetches conversations after mount via /api/cx-chat/history.

import ChatSidebarClient from './_components/ChatSidebarClient';
import ChatWorkspace from './_components/ChatWorkspace';

function SidebarSkeleton() {
    return (
        <div>
            <div className="shrink-0 p-3 border-b border-border/20">
                <div className="h-3.5 w-[40%] rounded bg-linear-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200px_100%] animate-ssr-shimmer" />
            </div>
            <div className="py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 mx-1">
                        <div className="w-4 h-4 rounded shrink-0 bg-linear-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200px_100%] animate-ssr-shimmer" />
                        <div className="h-3 rounded flex-1 bg-linear-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200px_100%] animate-ssr-shimmer" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[280px_1fr] grid-rows-[1fr] h-full overflow-hidden relative max-lg:grid-cols-1">
            <aside className="flex flex-col overflow-hidden border-r border-border/30 bg-background/50 backdrop-blur-[12px] max-lg:hidden">
                {/* Renders skeleton instantly, fetches conversations after mount */}
                <ChatSidebarClient />
            </aside>

            <div className="flex flex-col overflow-hidden min-w-0">
                <ChatWorkspace />
                <div style={{ display: 'none' }}>{children}</div>
            </div>
        </div>
    );
}
