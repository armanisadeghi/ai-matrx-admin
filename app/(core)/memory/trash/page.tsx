// /memory/trash — Memory › Forget & archive. The library trash (the same LibraryTrashTable
// /knowledge/trash renders), with doors to that page and to Drive's trash.
import { FolderX, Trash2 } from "lucide-react";
import { LibraryTrashTable } from "@/features/rag/components/library/LibraryTrashTable";
import { MemoryPageFrame } from "@/features/memory/pages/MemoryPageFrame";

export default function MemoryTrashRoute() {
  return (
    <MemoryPageFrame
      name="Forget & archive"
      wide
      actions={[
        { label: "Drive trash", icon: FolderX, href: "/files/trash", showLabel: true },
        { label: "Library trash page", icon: Trash2, href: "/knowledge/trash", showLabel: true },
      ]}
    >
      <LibraryTrashTable tableId="memory.library-trash" />
    </MemoryPageFrame>
  );
}
