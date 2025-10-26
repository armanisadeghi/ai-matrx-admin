// Sidebar Component
'use client';

import React, { JSX } from 'react';
import { FolderPlus, X, Loader2 } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { TaskFilterType } from '@/features/tasks/types';
import EditableProjectName from './EditableProjectName';

export default function Sidebar(): JSX.Element {
  const {
    projects,
    newProjectName,
    expandedProjects,
    activeProject,
    showAllProjects,
    isCreatingProject,
    operatingProjectId,
    loading,
    setNewProjectName,
    setActiveProject,
    setShowAllProjects,
    toggleProjectExpand,
    addProject,
    deleteProject,
    updateProject,
    setFilter,
    filter
  } = useTaskContext();

  const handleFilterClick = (filterType: TaskFilterType) => {
    setFilter(filterType);
  };

  return (
    <div className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col overflow-hidden">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Tasks</h1>
      
      {/* Project options */}
      <div className="flex items-center mb-3 gap-2 flex-shrink-0">
        <div 
          className={`flex-1 py-2 px-3 cursor-pointer rounded-md text-sm text-center transition-colors ${
            showAllProjects 
              ? 'bg-blue-500 text-white dark:bg-blue-600' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900'
          }`}
          onClick={() => setShowAllProjects(true)}
        >
          All Tasks
        </div>
        <div 
          className={`flex-1 py-2 px-3 cursor-pointer rounded-md text-sm text-center transition-colors ${
            !showAllProjects 
              ? 'bg-blue-500 text-white dark:bg-blue-600' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900'
          }`}
          onClick={() => setShowAllProjects(false)}
        >
          Projects
        </div>
      </div>
      
      {!showAllProjects && (
        <>
          {/* Add Project Form - Moved to top for better UX */}
          <form onSubmit={addProject} className="mb-3 flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">
              Create Project
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                disabled={isCreatingProject}
                className="flex-1 border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!newProjectName.trim() || isCreatingProject}
                className={`p-1.5 rounded-md transition-colors ${
                  newProjectName.trim() && !isCreatingProject
                    ? 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {isCreatingProject ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FolderPlus size={18} />
                )}
              </button>
            </div>
          </form>

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto mb-3 min-h-0">
            <h2 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">Your Projects</h2>
            <ul className="space-y-1">
              {projects.map(project => {
                const isOperating = operatingProjectId === project.id;
                return (
                  <li key={project.id} className="relative">
                    {/* Loading overlay for operating project */}
                    {isOperating && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 rounded-md flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div 
                      className={`flex items-center py-2 px-3 rounded-md text-sm w-full cursor-pointer transition-colors group ${
                        activeProject === project.id 
                          ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      } ${isOperating ? 'opacity-60 pointer-events-none' : ''}`}
                      onClick={() => !isOperating && setActiveProject(project.id)}
                    >
                      <EditableProjectName
                        name={project.name}
                        onSave={async (newName) => {
                          await updateProject(project.id, newName);
                        }}
                      />
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                        {project.tasks.length}
                      </span>
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        disabled={isOperating}
                        className="ml-1 text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
        {projects.length === 0 && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No projects yet.<br/>Create one above!
          </p>
        )}
        {projects.length === 0 && loading && (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
            ))}
          </div>
        )}
          </div>
        </>
      )}
      
      {/* Filter Options */}
      <div className="flex-shrink-0">
        <h2 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">Filter</h2>
        <div className="space-y-1">
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
              filter === 'all' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('all')}
          >
            All Tasks
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
              filter === 'incomplete' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('incomplete')}
          >
            Incomplete
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
              filter === 'completed' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('completed')}
          >
            Completed
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer transition-colors ${
              filter === 'overdue' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('overdue')}
          >
            Overdue
          </div>
        </div>
      </div>
    </div>
  );
}
