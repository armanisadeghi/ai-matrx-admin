import type { NoteListItem } from "../../types";
import { NotesSidebarClient } from "./NotesSidebarClient";

interface NotesSidebarProps {
    seeds: NoteListItem[];
}

/**
 * Server Component wrapper — establishes the 280px fixed-width sidebar frame.
 * The interactive inner content (filters, sorting, note list, context menus)
 * is a Client Component island.
 */
export function NotesSidebar({ seeds }: NotesSidebarProps) {
    return (
        <aside className="w-[280px] shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
            <NotesSidebarClient seeds={seeds} />
        </aside>
    );
}
