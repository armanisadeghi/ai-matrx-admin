// components/Sidebar.tsx
import React, { JSX } from 'react';
import { FolderPlus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { TaskFilterType } from '../types';

export default function Sidebar(): JSX.Element {
  const {
    projects,
    newProjectName,
    expandedProjects,
    activeProject,
    showAllProjects,
    setNewProjectName,
    setActiveProject,
    setShowAllProjects,
    toggleProjectExpand,
    addProject,
    deleteProject,
    setFilter,
    filter
  } = useTaskContext();

  const handleFilterClick = (filterType: TaskFilterType) => {
    setFilter(filterType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-6">TaskFlow</h1>
      
      {/* Project options */}
      <div className="flex items-center mb-4">
        <div 
          className={`py-2 px-4 cursor-pointer rounded-md text-sm mr-2 ${
            showAllProjects 
              ? 'bg-blue-500 text-white dark:bg-blue-600' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          onClick={() => setShowAllProjects(true)}
        >
          All Tasks
        </div>
        <div 
          className={`py-2 px-4 cursor-pointer rounded-md text-sm ${
            !showAllProjects 
              ? 'bg-blue-500 text-white dark:bg-blue-600' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          onClick={() => setShowAllProjects(false)}
        >
          By Project
        </div>
      </div>
      
      {!showAllProjects && (
        <>
          {/* Projects List */}
          <div className="mb-4">
            <h2 className="text-sm uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">Projects</h2>
            <ul>
              {projects.map(project => (
                <li key={project.id} className="mb-1">
                  <div 
                    className={`flex items-center py-2 px-3 rounded-md text-sm w-full cursor-pointer ${
                      activeProject === project.id 
                        ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveProject(project.id)}
                  >
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {project.tasks.length}
                    </span>
                    <div 
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectExpand(project.id);
                      }}
                    >
                      {expandedProjects.includes(project.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    <div 
                      className="ml-1 text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      onClick={(e) => deleteProject(project.id, e)}
                    >
                      <X size={14} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Add Project Form */}
          <form onSubmit={addProject} className="mb-6">
            <div className="flex items-center">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name..."
                className="flex-1 border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && addProject(e)}
              />
              <div
                onClick={addProject}
                className={`ml-2 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 ${
                  !newProjectName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FolderPlus size={18} />
              </div>
            </div>
          </form>
        </>
      )}
      
      {/* Filter Options */}
      <div className="mb-4">
        <h2 className="text-sm uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">Filter</h2>
        <div className="space-y-1">
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer ${
              filter === 'all' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('all')}
          >
            All Tasks
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer ${
              filter === 'incomplete' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('incomplete')}
          >
            Incomplete
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer ${
              filter === 'completed' 
                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleFilterClick('completed')}
          >
            Completed
          </div>
          <div 
            className={`py-2 px-3 rounded-md text-sm cursor-pointer ${
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

