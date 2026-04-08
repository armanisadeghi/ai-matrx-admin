import { NoteViewShell } from "@/features/notes/components/shell/NoteViewShell";
import { NoteEditorPlaceholder } from "@/features/notes/components/shell/NoteEditorPlaceholder";

export function generateMetadata() {
    return { title: "Diff" };
}

export default async function NoteDiffPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <NoteViewShell
            noteId={id}
            mode="diff"
            leftPanel={<NoteEditorPlaceholder noteId={id} mode="diff" />}
        />
    );
}
