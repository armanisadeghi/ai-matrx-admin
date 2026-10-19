// record-view: none — a sub-view (diff) inside a record or scope, not the record page; the record's own page carries the section
import { NoteVersionDiffPage } from "@/features/notes/components/diff/NoteVersionDiffPage";


export default async function NoteDiffRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NoteVersionDiffPage noteId={id} />;
}
