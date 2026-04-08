import { redirect } from "next/navigation";

/**
 * /notes/[id] — redirects to the default view mode (edit).
 * The layout already fetched and hydrated the note, so no extra fetch here.
 * Sub-page metadata is provided by the layout.
 */
export default async function NoteIndexPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/notes/${id}/edit`);
}
