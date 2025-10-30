'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, Folder, FolderPlus } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import CompactTaskItem from './CompactTaskItem';
import TaskDetailsPanel from './TaskDetailsPanel';
import AllTasksView from './AllTasksView';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TaskContentNew() {
  const {
    activeProject,
    showAllProjects,
    getFilteredTasks,
    projects,
    newTaskTitle,
    setNewTaskTitle,
    addTask,
    newProjectName,
    setNewProjectName,
    addProject,
    isCreatingTask,
    isCreatingProject,
    loading,
    toggleTaskComplete,
  } = useTaskContext();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<string | null>(null);
  const [showQuickAddDescription, setShowQuickAddDescription] = useState(false);
  const [quickAddDescription, setQuickAddDescription] = useState('');

  // Update selected project when activeProject changes
  useEffect(() => {
    if (activeProject) {
      setSelectedProjectForTask(activeProject);
    } else if (projects.length > 0) {
      setSelectedProjectForTask(projects[0].id);
    }
  }, [activeProject, projects]);

  const filteredTasks = getFilteredTasks();
  const hasProjects = projects.length > 0;
  const canShowTasks = activeProject || showAllProjects;
  const shouldShowProjectSelector = showAllProjects || !activeProject;

  // Find selected task
  const selectedTask = selectedTaskId
    ? filteredTasks.find(t => t.id === selectedTaskId)
    : null;

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId === selectedTaskId ? null : taskId);
  };

  const handleTaskToggle = (projectId: string, taskId: string) => {
    toggleTaskComplete(projectId, taskId);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) return;

    // Add task with description if provided - returns the created task ID
    const newTaskId = await addTask(e, quickAddDescription.trim(), '', selectedProjectForTask || undefined);
    
    // Open the details panel for the new task
    if (newTaskId) {
      setSelectedTaskId(newTaskId);
    }
    
    // Reset description fields
    setQuickAddDescription('');
    setShowQuickAddDescription(false);
  };

  const handleTitleChange = (value: string) => {
    setNewTaskTitle(value);
    // Show description textarea when user starts typing
    if (value.trim() && !showQuickAddDescription) {
      setShowQuickAddDescription(true);
    }
  };

  // Loading skeleton
  if (loading && projects.length === 0) {
    return (
      <div className="flex-1 flex overflow-hidden bg-textured">
        <div className="flex-1 p-4 space-y-3 animate-pulse">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-16"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-textured">
      {/* Empty state - No projects at all */}
      {!hasProjects && !showAllProjects && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                <FolderPlus className="w-10 h-10 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Welcome to Tasks!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Get organized by creating your first project.
            </p>

            <form onSubmit={addProject} className="space-y-3">
              <Input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name (e.g., Personal, Work)"
                disabled={isCreatingProject}
                className="w-full"
              />
              <Button
                type="submit"
                disabled={!newProjectName.trim() || isCreatingProject}
                className="w-full"
                size="lg"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus size={20} className="mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Empty state - Has projects but none selected */}
      {hasProjects && !activeProject && !showAllProjects && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                <svg
                  className="w-10 h-10 text-blue-500 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Select a project
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a project from the sidebar to view and manage its tasks
            </p>
          </div>
        </div>
      )}

      {/* Main content - Stable Two-Column Layout */}
      {canShowTasks && (
        <>
          {/* Task List Column - Fixed width, always in same position */}
          <div className="flex flex-col overflow-hidden flex-1 max-w-4xl">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* Quick Add Input */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <form onSubmit={handleAddTask} className="p-3 space-y-2">
                    <Input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Quick Add: e.g. 'Review Q4 budget proposal tomorrow at 2pm'..."
                      disabled={isCreatingTask}
                      className="border-none shadow-none focus-visible:ring-0 pl-2 text-sm"
                    />

                    {/* Description textarea - shows when user starts typing */}
                    {showQuickAddDescription && (
                      <Textarea
                        value={quickAddDescription}
                        onChange={(e) => setQuickAddDescription(e.target.value)}
                        placeholder="Add a description (optional)..."
                        className="text-sm resize-none min-h-[60px] border-gray-200 dark:border-gray-700"
                        rows={2}
                      />
                    )}

                    <div className="flex items-center gap-2">
                      {shouldShowProjectSelector && projects.length > 0 ? (
                        <Select
                          value={selectedProjectForTask || ''}
                          onValueChange={(value) => setSelectedProjectForTask(value)}
                        >
                          <SelectTrigger className="h-8 text-xs max-w-[200px]">
                            <div className="flex items-center gap-2">
                              <Folder size={12} className="text-gray-500 dark:text-gray-400" />
                              <span>
                                {projects.find((p) => p.id === selectedProjectForTask)?.name ||
                                  'Select project'}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <div className="flex items-center gap-2">
                                  <Folder size={12} />
                                  {project.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : activeProject ? (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Folder size={12} />
                          <span>{projects.find((p) => p.id === activeProject)?.name}</span>
                        </div>
                      ) : null}

                      <Button
                        type="submit"
                        disabled={!newTaskTitle.trim() || isCreatingTask || !selectedProjectForTask}
                        size="sm"
                        className="h-8 px-3 ml-auto"
                      >
                        {isCreatingTask ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <PlusCircle size={14} className="mr-1" />
                            Add Task
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Task List */}
                {showAllProjects ? (
                  <AllTasksView
                    selectedTaskId={selectedTaskId}
                    onTaskSelect={handleTaskSelect}
                    onTaskToggle={handleTaskToggle}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No tasks yet. Create one above!
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map((task) => (
                        <CompactTaskItem
                          key={task.id}
                          task={task}
                          isSelected={selectedTaskId === task.id}
                          onSelect={() => handleTaskSelect(task.id)}
                          onToggleComplete={() => handleTaskToggle(task.projectId, task.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Task Details Panel (Right Sidebar) - Always visible for stable layout */}
          <div className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {selectedTask ? (
              <TaskDetailsPanel
                task={selectedTask}
                onClose={() => setSelectedTaskId(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    No Task Selected
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select a task from the list to view and edit its details
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
