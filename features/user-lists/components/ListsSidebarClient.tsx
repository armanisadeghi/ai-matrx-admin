"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import type { UserList } from "../types";
import { ListsSidebar } from "./ListsSidebar";
import { CreateListDialog } from "./CreateListDialog";

interface ListsSidebarClientProps {
  lists: UserList[];
  /** Pass null — active ID is resolved from the URL pathname */
  activeListId: string | null;
}

export function ListsSidebarClient({ lists }: ListsSidebarClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const pathname = usePathname();

  // Extract active list ID from /lists/[id]
  const match = pathname.match(/^\/lists\/([^/]+)/);
  const activeListId = match ? match[1] : null;

  return (
    <>
      <ListsSidebar
        lists={lists}
        activeListId={activeListId}
        onCreateList={() => setCreateOpen(true)}
      />
      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
