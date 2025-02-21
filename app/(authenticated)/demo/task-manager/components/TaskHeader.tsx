import React from 'react';
import { useTaskContext } from '../context/TaskContext';

export default function TaskHeader() {
  const { showAllProjects, activeProject, projects } = useTaskContext();

  return (
    <header className="bg-white border-b border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
        {showAllProjects 
          ? 'All Projects' 
          : (projects.find(project => project.id === activeProject)?.name || 'Select a Project')}
      </h1>
    </header>
  );
}
