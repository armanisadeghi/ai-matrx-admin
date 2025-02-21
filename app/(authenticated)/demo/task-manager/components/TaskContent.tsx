// File: components/TaskContent.jsx
import React, { JSX } from 'react';
import { useTaskContext } from '../context/TaskContext';
import TaskHeader from './TaskHeader';
import TaskList from './TaskList';
import AddTaskForm from './AddTaskForm';

export default function TaskContent(): JSX.Element {
    const { 
      activeProject,
      showAllProjects,
      getFilteredTasks
    } = useTaskContext();
  
    const filteredTasks = getFilteredTasks();
  
    return (
      <div className="flex-1 flex flex-col">
        <TaskHeader />
        
        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          {/* Add Task Form - only show when a project is selected and not showing all projects */}
          {activeProject && !showAllProjects && <AddTaskForm />}
          
          {/* Tasks */}
          <TaskList tasks={filteredTasks} />
        </main>
      </div>
    );
  }
  