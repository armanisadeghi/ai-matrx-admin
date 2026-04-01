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

  const contentWithToggle = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-border/40 flex-shrink-0">
        <LayoutToggle value={variant} onChange={setVariant} />
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );

  if (variant === "tree") {
    const sidebar = (
      <ListsTreeNav lists={lists} activeListData={activeListData} />
    );
    return (
      <TreeLayoutShell sidebar={sidebar}>{contentWithToggle}</TreeLayoutShell>
    );
  }

  const sidebar = <CategoryPanel lists={lists} />;
  return (
    <SplitLayoutShell sidebar={sidebar}>{contentWithToggle}</SplitLayoutShell>
  );
}

export function ListsLayoutClient({ lists, children }: ListsLayoutClientProps) {
  return (
    <ActiveListProvider>
      <LayoutInner lists={lists}>{children}</LayoutInner>
    </ActiveListProvider>
  );
}
