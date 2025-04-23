"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { getTasksForService } from "@/constants/socket-schema";
import { useAppDispatch } from "@/lib/redux";

interface TaskSelectorProps {
  service: string;
  onTaskChange?: (task: string) => void;
}

export function TaskSelector({ service, onTaskChange }: TaskSelectorProps) {
  const dispatch = useAppDispatch();
  const [selectedTask, setSelectedTask] = React.useState("");

  // Reset task when service changes
  React.useEffect(() => {
    setSelectedTask("");
  }, [service]);

  const handleTaskChange = (value: string) => {
    setSelectedTask(value);
    if (onTaskChange) {
      onTaskChange(value);
    }
  };

  return (
    <Select value={selectedTask} onValueChange={handleTaskChange} disabled={!service}>
      <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
        <SelectValue placeholder={service ? "Select a task type..." : "Select service first"} />
      </SelectTrigger>
      <SelectContent>
        {getTasksForService(service).map(({ value, label }) => (
          <SelectItem
            key={`${service}-${value}`}
            value={value}
            className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 