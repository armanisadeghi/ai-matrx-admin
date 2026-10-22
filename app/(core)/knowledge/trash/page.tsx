// /knowledge/trash — the library trash as a page (the /files/trash pattern). The same list
// the "Library trash" drawer on /knowledge/library shows (`LibraryTrashTable`).

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { LibraryTrashTable } from "@/features/rag/components/library/LibraryTrashTable";

export default function KnowledgeTrashPage() {
  return (
    <>
      <RecordPageHeader level={{ name: "Library trash" }} />
      <div className="flex h-full flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col p-4 md:p-6">
          <LibraryTrashTable tableId="knowledge.library-trash" />
        </div>
      </div>
    </>
  );
}
