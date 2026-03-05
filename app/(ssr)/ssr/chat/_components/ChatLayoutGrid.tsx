'use client';

// ChatLayoutGrid — Client component that renders the sidebar + workspace grid.
// Reads sidebar state from ChatSidebarContext and applies Tailwind classes.
// Desktop: sidebar slides in as a grid column (280px).
// Mobile: sidebar becomes a fixed drawer overlay with backdrop.

import { useChatSidebar } from './ChatSidebarContext';

export default function ChatLayoutGrid({
    sidebar,
    workspace,
}: {
    sidebar: React.ReactNode;
    workspace: React.ReactNode;
}) {
    const { isOpen, close } = useChatSidebar();

    return (
        <div
            className={`grid grid-rows-[1fr] h-full overflow-hidden relative transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isOpen
                    ? 'lg:grid-cols-[280px_1fr]'
                    : 'lg:grid-cols-[0px_1fr]'
            } max-lg:grid-cols-[1fr]`}
        >
            {/* Mobile backdrop */}
            <div
                className={`fixed inset-0 z-[44] bg-black/40 transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={close}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside
                className={`
                    col-start-1 row-start-1
                    flex flex-col overflow-hidden w-[280px] min-w-[280px]
                    border-r border-border/30 bg-background/50 backdrop-blur-[12px]
                    transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}

                    max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:bottom-0
                    max-lg:z-[45] max-lg:bg-card max-lg:border-border
                    max-lg:shadow-[4px_0_24px_rgba(0,0,0,0.15)]
                `}
            >
                {sidebar}
            </aside>

            {/* Workspace */}
            <div className="col-start-2 max-lg:col-start-1 row-start-1 flex flex-col overflow-hidden min-w-0">
                {workspace}
            </div>
        </div>
    );
}
