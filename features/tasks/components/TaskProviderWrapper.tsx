"use client";

import { useEffect } from "react";
import { useTaskContext } from "@/features/tasks/context/TaskContext";

/**
 * Triggers task data initialization when mounted.
 * The global TaskProvider is already in the tree — this just tells it to fetch.
 */
export function TaskProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialize } = useTaskContext();
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
