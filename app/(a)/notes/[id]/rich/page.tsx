import { NoteViewShell } from "@/features/notes/components/shell/NoteViewShell";
import { NoteEditorPlaceholder } from "@/features/notes/components/shell/NoteEditorPlaceholder";

export function generateMetadata() {
    return { title: "Rich" };
}

export default async function NoteRichPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <NoteViewShell
            noteId={id}
            mode="rich"
            leftPanel={<NoteEditorPlaceholder noteId={id} mode="rich" />}
        />
    );
}
