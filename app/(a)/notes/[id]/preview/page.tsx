import { NoteViewShell } from "@/features/notes/components/shell/NoteViewShell";
import { NoteEditorPlaceholder } from "@/features/notes/components/shell/NoteEditorPlaceholder";

export function generateMetadata() {
    return { title: "Preview" };
}

export default async function NotePreviewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <NoteViewShell
            noteId={id}
            mode="preview"
            leftPanel={<NoteEditorPlaceholder noteId={id} mode="preview" />}
        />
    );
}
