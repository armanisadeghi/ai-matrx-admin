import type { ReactNode } from "react";
import { NotesSidebar } from "./NotesSidebar";
import { NotesMainArea } from "./NotesMainArea";
import type { NoteListItem } from "../../types";

interface NotesShellProps {
    /** SSR-seeded list — already hydrated into Redux by NoteListHydrator */
    seeds: NoteListItem[];
    children: ReactNode;
}

/**
 * Top-level Server Component shell for the notes route.
 * Renders the fixed-dimension layout: 280px sidebar + main area.
 * All dimensions are locked here so nothing shifts when data streams in.
 */
export function NotesShell({ seeds, children }: NotesShellProps) {
    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex overflow-hidden bg-background">
            <NotesSidebar seeds={seeds} />
            <NotesMainArea>{children}</NotesMainArea>
        </div>
    );
}
