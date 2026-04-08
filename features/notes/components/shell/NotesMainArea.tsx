import type { ReactNode } from "react";
import { NotesTabBar } from "./NotesTabBar";

interface NotesMainAreaProps {
    children: ReactNode;
}

/**
 * Server Component — establishes the main content area frame.
 * Fixed structure: tab bar row (h-9) + content below.
 * Content area is passed as children from each page/view.
 */
export function NotesMainArea({ children }: NotesMainAreaProps) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <NotesTabBar />
            <div className="flex-1 flex overflow-hidden">
                {children}
            </div>
        </div>
    );
}
