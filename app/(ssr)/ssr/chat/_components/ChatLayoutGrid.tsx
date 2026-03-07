'use client';

// ChatLayoutGrid — Sidebar + workspace layout for the SSR chat route.
//
// Desktop behaviour:
//   - The sidebar HEADER ROW (icons) is always visible, pinned into the shell
//     header zone at z-[41]. It never moves or disappears.
//   - The sidebar BODY slides in/out as a proper grid column (280px → 0px).
//     No overlay — it pushes the workspace.
//
// Mobile behaviour:
//   - The icon row is always visible in the header zone.
//   - The full sidebar (icons + body) is a fixed drawer from the left.

import { useChatSidebar } from './ChatSidebarContext';

export default function ChatLayoutGrid({
    sidebarHeader,
    sidebarBody,
    workspace,
}: {
    sidebarHeader: React.ReactNode;
    sidebarBody: React.ReactNode;
    workspace: React.ReactNode;
}) {
    const { isOpen, close } = useChatSidebar();

    return (
        <>
            {/* ── Persistent icon strip — always in the shell header zone ── */}
            {/* Fixed to the shell header band, right of the nav sidebar (left-[--shell-sidebar-w]).
                z-[41] keeps it above the shell header (z-40) so buttons receive clicks.
                [&>div] overrides SidebarAgentHeader's h-10 + border-b to match our header height
                and keep the strip borderless (the sidebar body has its own top border). */}
            <div
                className="chat-sidebar-icon-strip hidden lg:block fixed top-0 left-[var(--shell-sidebar-w)] z-[41] [&>div]:h-[var(--shell-header-h)] [&>div]:border-b-0"
                aria-hidden="false"
            >
                {sidebarHeader}
            </div>

            {/* ── Main layout grid ── */}
            <div
                className={`
                    grid grid-rows-[1fr] h-full overflow-hidden relative
                    transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isOpen ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[0px_1fr]'}
                    max-lg:grid-cols-[1fr]
                `}
            >
                {/* Mobile backdrop */}
                <div
                    className={`fixed inset-0 z-[44] bg-black/40 transition-opacity duration-300 lg:hidden ${
                        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={close}
                    aria-hidden="true"
                />

                {/* ── Sidebar body ──
                    Desktop: layout column, no backdrop, no overlay.
                    Mobile: fixed drawer from the left edge (behind nav sidebar). */}
                <aside
                    className={`
                        col-start-1 row-start-1
                        flex flex-col overflow-hidden w-[280px] min-w-[280px]
                        border-r border-border/30 bg-background
                        transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'}

                        max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:bottom-0
                        max-lg:z-[45] max-lg:border-border
                        max-lg:shadow-[4px_0_24px_rgba(0,0,0,0.15)]
                    `}
                >
                    {/* Mobile: show header icons inside the drawer too */}
                    <div className="lg:hidden">
                        {sidebarHeader}
                    </div>
                    {sidebarBody}
                </aside>

                {/* Workspace */}
                <div className="col-start-2 max-lg:col-start-1 row-start-1 flex flex-col overflow-hidden min-w-0">
                    {workspace}
                </div>
            </div>
        </>
    );
}
