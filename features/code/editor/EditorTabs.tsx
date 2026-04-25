"use client";

import React, { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  closeTab,
  selectActiveTabId,
  selectCodeTabs,
  setActiveTab,
} from "../redux/tabsSlice";
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

  if (order.length === 0) {
    return (
      <div
        role="tablist"
        className="flex h-full w-full items-center px-2 text-[11px] text-neutral-500 dark:text-neutral-400"
        aria-label="Editor tabs"
      >
        <span className="truncate">
          No open files — pick one from the Explorer.
        </span>
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className="flex h-full w-full items-stretch overflow-x-auto"
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
