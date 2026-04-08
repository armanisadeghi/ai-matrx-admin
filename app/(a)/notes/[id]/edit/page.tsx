import { NoteViewShell } from "@/features/notes/components/shell/NoteViewShell";
import { NoteEditorPlaceholder } from "@/features/notes/components/shell/NoteEditorPlaceholder";

export function generateMetadata() {
    return { title: "Edit" };
}

export default async function NoteEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <NoteViewShell
            noteId={id}
            mode="edit"
            leftPanel={<NoteEditorPlaceholder noteId={id} mode="edit" />}
        />
    );
}
