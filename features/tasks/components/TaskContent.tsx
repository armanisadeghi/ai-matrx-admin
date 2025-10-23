// Task Content Component
'use client';

import React, { JSX, useState } from 'react';
import { PlusCircle, FolderPlus, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import TaskHeader from './TaskHeader';
import TaskList from './TaskList';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function TaskContent(): JSX.Element {
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
    addProject
  } = useTaskContext();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const filteredTasks = getFilteredTasks();
  const hasProjects = projects.length > 0;
  const canShowTasks = activeProject || showAllProjects;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      return; // Don't create empty tasks
    }
    
    if (trimmedTitle.length > 200) {
      // Could add a toast here
      return;
    }
    
    await addTask(e as any, taskDescription.trim(), taskDueDate);
    
    // Reset all fields
    setTaskDescription('');
    setTaskDueDate('');
    setShowAdvanced(false);
  };

  // Show advanced options when user starts typing
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskTitle(e.target.value);
    if (e.target.value.trim() && !showAdvanced) {
      setShowAdvanced(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <TaskHeader />
      
      <main className="flex-1 overflow-y-auto p-6 bg-textured">
        {/* Add Task Form - Show when viewing tasks */}
        {canShowTasks && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <form onSubmit={handleAddTask} className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newTaskTitle}
                  onChange={handleTitleChange}
                  placeholder="Add a new task..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-5"
                >
                  <PlusCircle size={18} className="mr-2" />
                  Add Task
                </Button>
              </div>
              
              {/* Advanced options - Show when user starts typing */}
              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar size={14} />
                        Due Date (optional)
                      </label>
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <FileText size={14} />
                        Description (optional)
                      </label>
                      <Textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Add details..."
                        className="text-sm resize-none"
                        rows={1}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                  >
                    <ChevronUp size={14} />
                    Hide options
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
        
        {/* Empty state - No projects at all */}
        {!hasProjects && !showAllProjects && (
          <div className="flex items-center justify-center min-h-[400px]">
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
                Get organized by creating your first project, or switch to "All Tasks" to create standalone tasks.
              </p>
              
              {/* Inline Project Creation */}
              <form onSubmit={addProject} className="space-y-3">
                <Input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name (e.g., Personal, Work)"
                  className="w-full"
                />
                <Button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="w-full"
                  size="lg"
                >
                  <FolderPlus size={20} className="mr-2" />
                  Create Project
                </Button>
              </form>
            </div>
          </div>
        )}
        
        {/* Empty state - Has projects but none selected */}
        {hasProjects && !activeProject && !showAllProjects && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                  <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
        
        {/* Tasks List */}
        {canShowTasks && <TaskList tasks={filteredTasks} />}
      </main>
    </div>
  );
}
