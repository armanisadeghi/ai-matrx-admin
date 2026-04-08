import { Suspense } from "react";
import { getNote, getNoteListSeed, preloadNote } from "@/lib/notes/data";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { NoteListHydrator } from "@/features/notes/route/NoteListHydrator";
import { NoteHydrator } from "@/features/notes/route/NoteHydrator";
import { NotesShell } from "@/features/notes/components/shell/NotesShell";
import NotesLoading from "../loading";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const note = await getNote(id);
    return createDynamicRouteMetadata("/notes", {
        title: note.label,
        description: note.content
            ? note.content.slice(0, 120)
            : `Edit ${note.label}`,
    });
}

export default async function NoteDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Start both fetches immediately — parallel, not waterfall.
    preloadNote(id);
    const [seeds, note] = await Promise.all([getNoteListSeed(), getNote(id)]);

    return (
        <>
            {/* One-shot Redux hydration — list seeds first, then full note */}
            <NoteListHydrator seeds={seeds} />
            <NoteHydrator note={note} />
            <Suspense fallback={<NotesLoading />}>
                <NotesShell seeds={seeds}>{children}</NotesShell>
            </Suspense>
        </>
    );
}
