"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { useTaskContext } from "@/features/tasks/context/TaskContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Inbox, Plus, Folder, FolderKanban } from "lucide-react";
import CompactTaskItem from "@/features/tasks/components/CompactTaskItem";
import TaskDetailsPanel from "@/features/tasks/components/TaskDetailsPanel";
import {
  HierarchyCascade,
  EMPTY_SELECTION,
} from "@/features/agent-context/components/hierarchy-selection";
import type { HierarchySelection } from "@/features/agent-context/components/hierarchy-selection";

interface QuickTasksWorkspaceContextType {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const WorkspaceContext =
  React.createContext<QuickTasksWorkspaceContextType | null>(null);

export const useQuickTasksWorkspace = () => {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useQuickTasksWorkspace must be used within Provider");
  return ctx;
};

export function QuickTasksWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgs, flatProjects, isSuccess } = useNavTree();
  const { setActiveProject, activeProject, setShowAllProjects } =
    useTaskContext();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-select initial org
  useEffect(() => {
    if (isSuccess && !selectedOrgId && orgs.length > 0) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [isSuccess, orgs, selectedOrgId]);

  // Auto-select project when org changes
  useEffect(() => {
    if (selectedOrgId) {
      const projs = flatProjects.filter((p) => p.org_id === selectedOrgId);
      if (
        projs.length > 0 &&
        (!activeProject || !projs.find((p) => p.id === activeProject))
      ) {
        setActiveProject(projs[0].id);
        setShowAllProjects(false);
      }
    }
  }, [
    selectedOrgId,
    flatProjects,
    activeProject,
    setActiveProject,
    setShowAllProjects,
  ]);

  return (
    <WorkspaceContext.Provider
      value={{
        selectedOrgId,
        setSelectedOrgId,
        selectedProjectId: activeProject,
        setSelectedProjectId: (id) => {
          setActiveProject(id);
          if (id) setShowAllProjects(false);
        },
        selectedTaskId,
        setSelectedTaskId,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function QuickTasksSidebar() {
  const {
    selectedOrgId,
    setSelectedOrgId,
    selectedProjectId,
    setSelectedProjectId,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
  } = useQuickTasksWorkspace();

  const { getFilteredTasks, toggleTaskComplete } = useTaskContext();

  // getFilteredTasks uses TaskContext's activeProject and filter settings.
  const tasksToDisplay = useMemo(() => {
    let tasks = getFilteredTasks();
    if (searchQuery) {
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return tasks;
  }, [getFilteredTasks, searchQuery]);

  return (
    <div className="flex flex-col min-h-0 h-full bg-card">
      <div className="px-2 py-2 border-b shrink-0 bg-muted/10">
        <HierarchyCascade
          levels={["organization", "scope", "project", "task"]}
          value={{
            ...EMPTY_SELECTION,
            organizationId: selectedOrgId,
            projectId: selectedProjectId,
            taskId: selectedTaskId,
          }}
          onChange={(sel) => {
            if (sel.organizationId !== selectedOrgId)
              setSelectedOrgId(sel.organizationId);
            if (sel.projectId !== selectedProjectId)
              setSelectedProjectId(sel.projectId);
            if (sel.taskId !== selectedTaskId) setSelectedTaskId(sel.taskId);
          }}
          layout="vertical"
        />
      </div>

      <div className="px-2 py-1.5 border-b flex items-center justify-between shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-[11px]"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {!selectedProjectId ? (
          <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 mt-4">
            <Folder className="h-6 w-6 opacity-20" />
            <p>Select a project to view tasks.</p>
          </div>
        ) : tasksToDisplay.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 mt-4">
            <Inbox className="h-6 w-6 opacity-20" />
            <p>No tasks found.</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            {tasksToDisplay.map((task) => (
              <CompactTaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() => setSelectedTaskId(task.id)}
                onToggleComplete={() =>
                  toggleTaskComplete(task.projectId, task.id)
                }
                hideProjectName={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickTasksMain() {
  const { selectedTaskId, setSelectedTaskId, selectedProjectId } =
    useQuickTasksWorkspace();
  const {
    getFilteredTasks,
    newTaskTitle,
    setNewTaskTitle,
    isCreatingTask,
    addTask,
  } = useTaskContext();

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return getFilteredTasks().find((t) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, getFilteredTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    const newId = await addTask(e, "", "", selectedProjectId, "medium");
    if (newId) setSelectedTaskId(newId);
  };

  if (!selectedTask) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-6 bg-card/50">
        <FolderKanban className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h3 className="text-sm font-medium mb-1">No Task Selected</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Select a task from the sidebar, or create a new one.
        </p>

        <form onSubmit={handleAddTask} className="flex gap-2 w-full max-w-sm">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter new task title..."
            className="h-8 text-[13px] flex-1"
            disabled={isCreatingTask || !selectedProjectId}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs font-semibold"
            disabled={
              isCreatingTask || !newTaskTitle.trim() || !selectedProjectId
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
          </Button>
        </form>

        {!selectedProjectId && (
          <p className="text-[10px] text-destructive mt-2">
            Please select a project in the sidebar first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background overflow-hidden relative">
      {/* Top subtle bar for moving back on small layouts or showing title */}
      <div className="absolute top-2 right-2 z-10 opacity-0 hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs bg-background/50 backdrop-blur"
          onClick={() => setSelectedTaskId(null)}
        >
          Close Details
        </Button>
      </div>
      <TaskDetailsPanel
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
