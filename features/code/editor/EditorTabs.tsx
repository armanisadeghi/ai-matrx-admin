"use client";

import React, { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  closeTab,
  selectActiveTabId,
  selectCodeTabs,
  setActiveTab,
} from "../redux";
import { EditorTab } from "./EditorTab";

export const EditorTabs: React.FC = () => {
  const dispatch = useAppDispatch();
  const { byId, order } = useAppSelector(selectCodeTabs);
  const activeId = useAppSelector(selectActiveTabId);

  const handleSelect = useCallback(
    (id: string) => {
      dispatch(setActiveTab(id));
    },
    [dispatch],
  );

  const handleClose = useCallback(
    (id: string) => {
      dispatch(closeTab(id));
    },
    [dispatch],
  );

  if (order.length === 0) return null;

  return (
    <div
      role="tablist"
      className="flex h-9 w-full shrink-0 items-stretch overflow-x-auto border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {order.map((id) => {
        const tab = byId[id];
        if (!tab) return null;
        return (
          <EditorTab
            key={id}
            id={id}
            name={tab.name}
            active={id === activeId}
            dirty={tab.dirty}
            onSelect={handleSelect}
            onClose={handleClose}
            onMiddleClick={handleClose}
          />
        );
      })}
    </div>
  );
};
