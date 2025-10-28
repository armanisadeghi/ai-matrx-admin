'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, CheckSquare } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import CompactTaskItem from './CompactTaskItem';

interface AllTasksViewProps {
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  onTaskToggle: (projectId: string, taskId: string) => void;
}

export default function AllTasksView({ selectedTaskId, onTaskSelect, onTaskToggle }: AllTasksViewProps) {
  const { projects, filter, loading } = useTaskContext();
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  // Show loading state during initial fetch
  if (loading && projects.length === 0) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, projectIndex) => (
          <div key={projectIndex} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-3 flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
            <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
              {[...Array(2)].map((_, taskIndex) => (
                <div key={taskIndex} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Filter tasks based on current filter
  const getFilteredTasksForProject = (project: any) => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (filter) {
      case 'completed':
        return project.tasks.filter((task: any) => task.completed);
      case 'incomplete':
        return project.tasks.filter((task: any) => !task.completed);
      case 'overdue':
        return project.tasks.filter((task: any) => 
          !task.completed && task.dueDate && task.dueDate < today
        );
      default:
        return project.tasks;
    }
  };

  // Only show projects that have tasks matching the filter
  const projectsWithTasks = projects
    .map(project => ({
      ...project,
      filteredTasks: getFilteredTasksForProject(project)
    }))
    .filter(project => project.filteredTasks.length > 0);

  if (projectsWithTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckSquare className="w-8 h-8 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          No tasks found
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filter === 'all' 
            ? 'Create your first task to get started!'
            : `No ${filter} tasks at the moment`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projectsWithTasks.map(project => {
        const isCollapsed = collapsedProjects.has(project.id);
        const taskCount = project.filteredTasks.length;
        const completedCount = project.filteredTasks.filter((t: any) => t.completed).length;

        return (
          <div 
            key={project.id} 
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
          >
            {/* Project Header */}
            <button
              onClick={() => toggleProjectCollapse(project.id)}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              )}
              
              <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {project.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {completedCount} of {taskCount} completed
                </p>
              </div>

              {/* Task count badge */}
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium">
                {taskCount}
              </div>
            </button>

            {/* Tasks List */}
            {!isCollapsed && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-200 dark:border-gray-700">
                {project.filteredTasks.map((task: any) => (
                  <CompactTaskItem
                    key={task.id}
                    task={{
                      ...task,
                      projectId: project.id,
                      projectName: project.name
                    }}
                    isSelected={selectedTaskId === task.id}
                    onSelect={() => onTaskSelect(task.id)}
                    onToggleComplete={() => onTaskToggle(project.id, task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
