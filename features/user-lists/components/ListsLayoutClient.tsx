"use client";

import React from "react";
import type { UserList } from "../types";
import { LayoutToggle, useLayoutVariant } from "./LayoutToggle";
import { SplitLayoutShell } from "./SplitLayoutShell";
import { TreeLayoutShell } from "./TreeLayoutShell";
import { CategoryPanel } from "./CategoryPanel";
import { ListsTreeNav } from "./ListsTreeNav";
import { ActiveListProvider, useActiveList } from "./ActiveListContext";

interface ListsLayoutClientProps {
  lists: UserList[];
  children: React.ReactNode;
}

function LayoutInner({ lists, children }: ListsLayoutClientProps) {
  const [variant, setVariant] = useLayoutVariant();
  const { activeListData } = useActiveList();

  // The toggle bar sits inside the right panel so each shell only needs to
  // render sidebar | (toggle + content). Height is owned by the shell itself.
  const contentWithToggle = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-border/40 flex-shrink-0">
        <LayoutToggle value={variant} onChange={setVariant} />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );

  if (variant === "tree") {
    return (
      <TreeLayoutShell
        sidebar={<ListsTreeNav lists={lists} activeListData={activeListData} />}
      >
        {contentWithToggle}
      </TreeLayoutShell>
    );
  }

  return (
    <SplitLayoutShell sidebar={<CategoryPanel lists={lists} />}>
      {contentWithToggle}
    </SplitLayoutShell>
  );
}

export function ListsLayoutClient({ lists, children }: ListsLayoutClientProps) {
  return (
    <ActiveListProvider>
      <LayoutInner lists={lists}>{children}</LayoutInner>
    </ActiveListProvider>
  );
}
