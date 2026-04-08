import { NoteViewShell } from "@/features/notes/components/shell/NoteViewShell";
import { NoteEditorPlaceholder } from "@/features/notes/components/shell/NoteEditorPlaceholder";

export function generateMetadata() {
    return { title: "Split" };
}

export default async function NoteSplitPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <NoteViewShell
            noteId={id}
            mode="split"
            leftPanel={<NoteEditorPlaceholder noteId={id} mode="edit" />}
            rightPanel={<NoteEditorPlaceholder noteId={id} mode="preview" />}
        />
    );
}
