import { Suspense } from "react";
import { getNoteListSeed } from "@/lib/notes/data";
import { NoteListHydrator } from "@/features/notes/route/NoteListHydrator";
import { NotesShell } from "@/features/notes/components/shell/NotesShell";
import NotesLoading from "./loading";

/**
 * Notes index page — no note selected.
 * Fetches the list seed SSR, hydrates Redux, renders the shell with empty main area.
 */
export default async function NotesPage() {
    const seeds = await getNoteListSeed();

    return (
        <>
            <NoteListHydrator seeds={seeds} />
            <Suspense fallback={<NotesLoading />}>
                <NotesShell seeds={seeds}>
                    <NotesEmptyState />
                </NotesShell>
            </Suspense>
        </>
    );
}

function NotesEmptyState() {
    return (
        <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="space-y-2 max-w-xs">
                <p className="text-sm font-medium text-foreground">No note open</p>
                <p className="text-xs text-muted-foreground">
                    Select a note from the sidebar or create a new one.
                </p>
            </div>
        </div>
    );
}
