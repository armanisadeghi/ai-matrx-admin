// record-view: note
// app/(core)/notes/[id]/page.tsx
// Direct deep-link to a single note by id.
// The parent layout renders <NotesView /> which reads the [id] param via
// useParams() and opens the note as the active tab. This page is an empty
// placeholder so the route resolves — same pattern as app/(core)/notes/page.tsx.
// A segment that is not a note id (/notes/history) is a wrong link, not a
// note: NotesRouteBody shows this page instead of the workspace, and it
// answers with the notes not-found.
import { notFound } from "next/navigation";
import { isRfc4122Uuid } from "@ai-matrx/kit/uuid";

export default async function NoteByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isRfc4122Uuid(id)) notFound();
  return null;
}
