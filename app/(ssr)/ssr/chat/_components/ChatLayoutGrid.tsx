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
//   - Default shell hamburger is hidden on /ssr/chat via CSS.
//   - ChatHeaderControls renders a mobile bar: hamburger | agent name | new chat.
//   - The chat sidebar slides in as a fixed drawer (z-45) from the left.
//   - A back (ArrowLeft) button at top of the drawer closes it + opens the main
//     app menu by programmatically checking #shell-mobile-menu.
//
// Dock hiding:
//   A hidden sentinel div carries the .shell-hide-dock class so that
//   body:has(.shell-hide-dock) in shell.css hides the portaled MobileDock
//   (which lives outside .shell-root in #glass-layer) and removes the
//   bottom padding from shell-main. display:none elements still match CSS :has().

import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChatSidebar } from './ChatSidebarContext';

// ── Mobile app-menu back button ──────────────────────────────────────────────
function MobileAppMenuBack() {
    const { close } = useChatSidebar();

    const handleBack = useCallback(() => {
        close();
        const menuCheckbox = document.getElementById('shell-mobile-menu') as HTMLInputElement | null;
        if (menuCheckbox) {
            menuCheckbox.checked = true;
            menuCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, [close]);

    return (
        <button
            type="button"
            onClick={handleBack}
            className="lg:hidden flex items-center justify-center w-11 h-11 ml-1 mt-1 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 active:bg-accent/60 transition-colors flex-shrink-0"
            aria-label="Go to main navigation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            <ArrowLeft className="h-5 w-5" />
        </button>
    );
}

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
            {/* Dock-hide sentinel — invisible, only carries the CSS class.
                body:has(.shell-hide-dock) in shell.css hides the portaled MobileDock
                and removes dock padding from shell-main. display:none still matches :has(). */}
            <div className="shell-hide-dock" style={{ display: 'none' }} aria-hidden="true" />

            {/* ── Persistent icon strip — always in the shell header zone ── */}
            <div
                className="chat-sidebar-icon-strip hidden lg:block fixed top-0 left-[var(--shell-sidebar-w)] z-[41] [&>div]:h-[var(--shell-header-h)] [&>div]:border-b-0"
                aria-hidden="false"
            >
                {sidebarHeader}
            </div>

            {/* ── Main layout grid ── */}
            <div
                className={[
                    'grid grid-rows-[1fr] h-full overflow-hidden relative',
                    'transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isOpen ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[0px_1fr]',
                    'max-lg:grid-cols-[1fr]',
                ].join(' ')}
            >
                {/* Mobile backdrop */}
                <div
                    className={[
                        'fixed inset-0 z-[44] bg-black/40 transition-opacity duration-300 lg:hidden',
                        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
                    ].join(' ')}
                    onClick={close}
                    aria-hidden="true"
                />

                {/* ── Sidebar ── */}
                <aside
                    className={[
                        'col-start-1 row-start-1',
                        'flex flex-col overflow-hidden w-[280px] min-w-[280px]',
                        'border-r border-border/30 bg-background',
                        'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        isOpen ? 'translate-x-0' : '-translate-x-full',
                        'max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:bottom-0',
                        'max-lg:z-[45] max-lg:border-border',
                        'max-lg:shadow-[4px_0_24px_rgba(0,0,0,0.15)]',
                    ].join(' ')}
                >
                    {/* Mobile: header icons shown inside the drawer */}
                    <div className="lg:hidden">
                        {sidebarHeader}
                    </div>

                    {/* Mobile-only back arrow — closes chat sidebar, opens main app menu */}
                    <MobileAppMenuBack />

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
