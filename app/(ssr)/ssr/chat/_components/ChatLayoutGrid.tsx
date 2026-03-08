'use client';

// ChatLayoutGrid — Sidebar + workspace layout for the SSR chat route.
//
// Desktop: CSS grid with animated column (280px ↔ 0px) + React-controlled translate.
// Mobile:  Fixed drawer. The hamburger in ChatMobileHeaderBar is a <label> for
//          #chat-sidebar-mobile (server-rendered, zero JS, visible instantly).
//          After hydration, a useEffect bridges the checkbox to React isOpen state,
//          so the drawer slide is driven by React className — reliable across all browsers.
//
// Why bridge checkbox → React state:
//   Tailwind's -translate-x-full uses CSS custom properties (--tw-translate-x).
//   A CSS :has() override with transform: translateX(0) !important doesn't cleanly
//   override those custom properties in all browser/build combinations.
//   Bridging to React is simpler, reliable, and still server-first (the label/checkbox
//   are server-rendered HTML; only the slide animation needs JS).

import { useCallback, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChatSidebar } from './ChatSidebarContext';

// ── Mobile back button ────────────────────────────────────────────────────────
function MobileAppMenuBack() {
    const { close } = useChatSidebar();

    const handleBack = useCallback(() => {
        // Close drawer via React state
        close();
        // Sync checkbox (so it's unchecked when drawer is closed)
        const chatCheckbox = document.getElementById('chat-sidebar-mobile') as HTMLInputElement | null;
        if (chatCheckbox) chatCheckbox.checked = false;
        // Open main app menu
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
            className="lg:hidden flex items-center justify-center w-9 h-9 ml-1 mt-0.5 mb-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 active:bg-accent/60 transition-colors flex-shrink-0"
            aria-label="Go to main navigation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            <ArrowLeft className="h-4 w-4" />
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
    const { isOpen, toggle, close } = useChatSidebar();

    // Bridge the CSS checkbox to React state.
    // The hamburger label (#chat-sidebar-mobile) can be clicked before hydration,
    // but the drawer slide needs JS. After hydration this listener kicks in and
    // the React isOpen state drives the drawer translate from then on.
    useEffect(() => {
        const checkbox = document.getElementById('chat-sidebar-mobile') as HTMLInputElement | null;
        if (!checkbox) return;

        const handleChange = () => {
            if (checkbox.checked && !isOpen) toggle();
            else if (!checkbox.checked && isOpen) toggle();
        };

        checkbox.addEventListener('change', handleChange);
        return () => checkbox.removeEventListener('change', handleChange);
    }, [isOpen, toggle]);

    // When React closes the sidebar (e.g., navigating away), sync checkbox too.
    useEffect(() => {
        const checkbox = document.getElementById('chat-sidebar-mobile') as HTMLInputElement | null;
        if (!checkbox) return;
        // Only sync on mobile — on desktop the checkbox isn't the control mechanism
        if (window.matchMedia('(min-width: 1024px)').matches) return;
        checkbox.checked = isOpen;
    }, [isOpen]);

    return (
        <>
            {/* Dock-hide sentinel */}
            <div className="shell-hide-dock" style={{ display: 'none' }} aria-hidden="true" />

            {/* ── Icon strip — desktop only, pinned in header zone ── */}
            <div
                className="chat-sidebar-icon-strip hidden lg:block fixed top-0 left-[var(--shell-sidebar-w)] z-[41] [&>div]:h-[var(--shell-header-h)] [&>div]:border-b-0"
                aria-hidden="false"
            >
                {sidebarHeader}
            </div>

            {/* ── Main grid ── */}
            <div
                className={[
                    'grid grid-rows-[1fr] h-full overflow-hidden relative',
                    'transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isOpen ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[0px_1fr]',
                    'max-lg:grid-cols-[1fr]',
                ].join(' ')}
            >
                {/* Mobile backdrop — CSS-driven opacity, label closes via checkbox */}
                <label
                    htmlFor="chat-sidebar-mobile"
                    className="chat-sidebar-backdrop lg:hidden"
                    aria-label="Close chat menu"
                />

                {/* ── Sidebar ──
                    translate-x controlled by React isOpen for BOTH desktop + mobile.
                    Desktop needs it to clip the overflow from 0px grid column.
                    Mobile needs it to slide in/out as a fixed drawer. */}
                <aside
                    className={[
                        'chat-sidebar-drawer',
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
                    {/* Mobile: back arrow only — no header icons needed.
                        ChatMobileHeaderBar (fixed in header zone) covers that role. */}
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
