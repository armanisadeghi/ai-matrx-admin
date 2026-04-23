"use client";

import React from "react";
import { Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectActiveView, setActiveView } from "../redux";
import { ACTIVITY_BAR_BG, PANE_BORDER } from "../styles/tokens";
import { ActivityBarIcon } from "./ActivityBarIcon";
import { ACTIVITY_VIEWS } from "./activity-views";

export const ACTIVITY_BAR_WIDTH = 48;

interface ActivityBarProps {
  className?: string;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const activeView = useAppSelector(selectActiveView);

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      style={{ width: ACTIVITY_BAR_WIDTH }}
      className={cn(
        "flex h-full shrink-0 flex-col items-center border-r",
        ACTIVITY_BAR_BG,
        PANE_BORDER,
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center py-1">
        {ACTIVITY_VIEWS.map((view) => (
          <ActivityBarIcon
            key={view.id}
            label={view.label}
            icon={view.icon}
            shortcut={view.shortcut}
            active={activeView === view.id}
            onClick={() => dispatch(setActiveView(view.id))}
          />
        ))}
      </div>
      <div className="flex flex-col items-center py-1">
        <button
          type="button"
          aria-label="Accounts"
          className="flex h-12 w-12 items-center justify-center text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <User size={22} strokeWidth={1.6} />
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-12 w-12 items-center justify-center text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <Settings size={22} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
};
