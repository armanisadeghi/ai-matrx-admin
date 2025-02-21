'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Paperclip, CheckCircle, Circle, ChevronDown, ChevronUp, X, FolderPlus, Copy, Calendar } from 'lucide-react';

// Main App Component
export default function TaskApp() {
  // State management
  const [projects, setProjects] = useState([
    { 
      id: 1, 
      name: 'Work Projects', 
      tasks: [
        { 
          id: 1, 
          title: 'Finish quarterly report', 
          completed: false, 
          description: 'Include sales data and projections for Q3', 
          attachments: ['report-draft.pdf'],
          dueDate: '2025-03-01'
        },
        { 
          id: 2, 
          title: 'Send client proposal', 
          completed: true, 
          description: '', 
          attachments: [],
          dueDate: '2025-02-15'
        }
      ]
    },
    { 
      id: 2, 
      name: 'Personal', 
      tasks: [
        { 
          id: 3, 
          title: 'Grocery shopping', 
          completed: false, 
          description: 'Get ingredients for dinner party', 
          attachments: [],
          dueDate: '2025-02-25'
        },
        { 
          id: 4, 
          title: 'Call mom', 
          completed: false, 
          description: '', 
          attachments: [],
          dueDate: '2025-02-22'
        }
      ]
    }
  ]);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProjects, setExpandedProjects] = useState([1, 2]);
  const [expandedTasks, setExpandedTasks] = useState([]);
  const [activeProject, setActiveProject] = useState(1);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference for dark mode
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Toggle project expansion
  const toggleProjectExpand = (projectId) => {
    setExpandedProjects(
      expandedProjects.includes(projectId)
        ? expandedProjects.filter(id => id !== projectId)
        : [...expandedProjects, projectId]
    );
  };

  // Toggle task expansion for details
  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(
      expandedTasks.includes(taskId)
        ? expandedTasks.filter(id => id !== taskId)
        : [...expandedTasks, taskId]
    );
  };

  // Add new project
  const addProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProject = {
      id: Date.now(),
      name: newProjectName,
      tasks: []
    };
    
    setProjects([...projects, newProject]);
    setNewProjectName('');
  };

  // Delete project
  const deleteProject = (projectId, e) => {
    e.stopPropagation();
    setProjects(projects.filter(project => project.id !== projectId));
  };

  // Add new task to active project
  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const updatedProjects = projects.map(project => {
      if (project.id === activeProject) {
        return {
          ...project,
          tasks: [
            ...project.tasks,
            {
              id: Date.now(),
              title: newTaskTitle,
              completed: false,
              description: '',
              attachments: [],
              dueDate: ''
            }
          ]
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
    setNewTaskTitle('');
  };

  // Toggle task completion
  const toggleTaskComplete = (projectId, taskId) => {
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Update task description
  const updateTaskDescription = (projectId, taskId, description) => {
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId ? { ...task, description } : task
          )
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Update task due date
  const updateTaskDueDate = (projectId, taskId, dueDate) => {
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId ? { ...task, dueDate } : task
          )
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Delete task
  const deleteTask = (projectId, taskId, e) => {
    e.stopPropagation();
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.filter(task => task.id !== taskId)
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Add attachment to task (simulated)
  const addAttachment = (projectId, taskId, e) => {
    e.stopPropagation();
    // In a real app, this would open a file picker
    const mockAttachmentName = `attachment-${Math.floor(Math.random() * 1000)}.pdf`;
    
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId 
              ? { ...task, attachments: [...task.attachments, mockAttachmentName] } 
              : task
          )
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Remove attachment from task
  const removeAttachment = (projectId, taskId, attachmentName) => {
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId 
              ? { 
                  ...task, 
                  attachments: task.attachments.filter(att => att !== attachmentName) 
                } 
              : task
          )
        };
      }
      return project;
    });
    
    setProjects(updatedProjects);
  };

  // Copy task to clipboard
  const copyTaskToClipboard = (task, e) => {
    e.stopPropagation();
    const taskText = `${task.title}${task.description ? `\n${task.description}` : ''}${task.dueDate ? `\nDue: ${task.dueDate}` : ''}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(taskText)
        .then(() => {
          alert('Task copied to clipboard');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
        });
    }
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    
    if (showAllProjects) {
      // Flatten all tasks from all projects and apply filter
      let allTasks = [];
      
      projects.forEach(project => {
        project.tasks.forEach(task => {
          allTasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name
          });
        });
      });
      
      // Apply the current filter
      switch (filter) {
        case 'completed':
          return allTasks.filter(task => task.completed);
        case 'incomplete':
          return allTasks.filter(task => !task.completed);
        case 'overdue':
          return allTasks.filter(task => !task.completed && task.dueDate && task.dueDate < today);
        default:
          return allTasks;
      }
    } else {
      // Return tasks for the active project only
      const activeProjectData = projects.find(project => project.id === activeProject);
      
      if (!activeProjectData) return [];
      
      // Apply the current filter
      switch (filter) {
        case 'completed':
          return activeProjectData.tasks.filter(task => task.completed).map(task => ({
            ...task, 
            projectId: activeProject,
            projectName: activeProjectData.name
          }));
        case 'incomplete':
          return activeProjectData.tasks.filter(task => !task.completed).map(task => ({
            ...task, 
            projectId: activeProject,
            projectName: activeProjectData.name
          }));
        case 'overdue':
          return activeProjectData.tasks.filter(task => 
            !task.completed && task.dueDate && task.dueDate < today
          ).map(task => ({
            ...task, 
            projectId: activeProject,
            projectName: activeProjectData.name
          }));
        default:
          return activeProjectData.tasks.map(task => ({
            ...task, 
            projectId: activeProject,
            projectName: activeProjectData.name
          }));
      }
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Get filtered tasks
  const filteredTasks = getFilteredTasks();

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r p-4`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>TaskFlow</h1>
          <div 
            className={`cursor-pointer p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            onClick={toggleDarkMode}
          >
            {darkMode ? '☀️' : '🌙'}
          </div>
        </div>
        
        {/* Project options */}
        <div className="flex items-center mb-4">
          <div 
            className={`py-2 px-4 cursor-pointer rounded-md text-sm mr-2 ${showAllProjects ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            onClick={() => setShowAllProjects(true)}
          >
            All Tasks
          </div>
          <div 
            className={`py-2 px-4 cursor-pointer rounded-md text-sm ${!showAllProjects ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            onClick={() => setShowAllProjects(false)}
          >
            By Project
          </div>
        </div>
        
        {!showAllProjects && (
          <>
            {/* Projects List */}
            <div className="mb-4">
              <h2 className={`text-sm uppercase font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Projects</h2>
              <ul>
                {projects.map(project => (
                  <li key={project.id} className="mb-1">
                    <div 
                      className={`flex items-center py-2 px-3 rounded-md text-sm w-full cursor-pointer ${activeProject === project.id ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
                      onClick={() => setActiveProject(project.id)}
                    >
                      <span className="truncate">{project.name}</span>
                      <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {project.tasks.length}
                      </span>
                      <div 
                        className={`ml-2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectExpand(project.id);
                        }}
                      >
                        {expandedProjects.includes(project.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                      <div 
                        className={`ml-1 ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
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
                  className={`flex-1 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white' border`}
                  onKeyPress={(e) => e.key === 'Enter' && addProject(e)}
                />
                <div
                  onClick={addProject}
                  className={`ml-2 cursor-pointer ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'} ${!newProjectName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FolderPlus size={18} />
                </div>
              </div>
            </form>
          </>
        )}
        
        {/* Filter Options */}
        <div className="mb-4">
          <h2 className={`text-sm uppercase font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Filter</h2>
          <div className="space-y-1">
            <div 
              className={`py-2 px-3 rounded-md text-sm cursor-pointer ${filter === 'all' ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              onClick={() => setFilter('all')}
            >
              All Tasks
            </div>
            <div 
              className={`py-2 px-3 rounded-md text-sm cursor-pointer ${filter === 'incomplete' ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              onClick={() => setFilter('incomplete')}
            >
              Incomplete
            </div>
            <div 
              className={`py-2 px-3 rounded-md text-sm cursor-pointer ${filter === 'completed' ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </div>
            <div 
              className={`py-2 px-3 rounded-md text-sm cursor-pointer ${filter === 'overdue' ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              onClick={() => setFilter('overdue')}
            >
              Overdue
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
          <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {showAllProjects ? 'All Projects' : (projects.find(project => project.id === activeProject)?.name || 'Select a Project')}
          </h1>
        </header>
        
        {/* Task List */}
        <main className={`flex-1 overflow-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {/* Add Task Form - only show when a project is selected and not showing all projects */}
          {activeProject && !showAllProjects && (
            <form onSubmit={addTask} className="mb-6">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task..."
                  className={`flex-1 border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  onKeyPress={(e) => e.key === 'Enter' && addTask(e)}
                />
                <div
                  onClick={addTask}
                  className={`ml-2 p-2 rounded-md ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} ${!newTaskTitle.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <PlusCircle size={18} />
                </div>
              </div>
            </form>
          )}
          
          {/* Tasks */}
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
                
                return (
                  <div 
                    key={task.id} 
                    className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}
                  >
                    <div className="p-4">
                      <div className="flex items-start">
                        <div 
                          className={`mt-1 mr-3 cursor-pointer ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'}`}
                          onClick={() => toggleTaskComplete(task.projectId, task.id)}
                        >
                          {task.completed ? (
                            <CheckCircle className={darkMode ? 'text-green-400' : 'text-green-500'} size={20} />
                          ) : (
                            <Circle size={20} />
                          )}
                        </div>
                        <div className="flex-1" onClick={() => toggleTaskExpand(task.id)}>
                          {showAllProjects && (
                            <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {task.projectName}
                            </div>
                          )}
                          <div className="flex items-center">
                            <h3 className={`text-lg font-medium ${task.completed ? (darkMode ? 'text-gray-500 line-through' : 'text-gray-500 line-through') : isPastDue ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                              {task.title}
                            </h3>
                            {task.dueDate && (
                              <div className={`ml-2 text-xs flex items-center ${isPastDue ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                                <Calendar size={12} className="mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          {/* Task actions moved to separate row */}
                          <div className="flex items-center mt-2">
                            <div 
                              className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} text-sm flex items-center cursor-pointer`}
                              onClick={() => toggleTaskExpand(task.id)}
                            >
                              {expandedTasks.includes(task.id) ? (
                                <>
                                  <ChevronUp size={16} className="mr-1" />
                                  <span>Hide details</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={16} className="mr-1" />
                                  <span>Show details</span>
                                </>
                              )}
                            </div>
                            
                            <div className="ml-auto flex items-center space-x-3">
                              <div 
                                className={`${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} cursor-pointer`}
                                onClick={(e) => copyTaskToClipboard(task, e)}
                                title="Copy to clipboard"
                              >
                                <Copy size={16} />
                              </div>
                              <div 
                                className={`${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} cursor-pointer`}
                                onClick={(e) => addAttachment(task.projectId, task.id, e)}
                                title="Add attachment"
                              >
                                <Paperclip size={16} />
                              </div>
                              <div 
                                className={`${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'} cursor-pointer`}
                                onClick={(e) => deleteTask(task.projectId, task.id, e)}
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {expandedTasks.includes(task.id) && (
                        <div className="mt-4 pl-9">
                          <div className="mb-4">
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) => updateTaskDueDate(task.projectId, task.id, e.target.value)}
                              className={`border rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                              Details
                            </label>
                            <textarea
                              value={task.description}
                              onChange={(e) => updateTaskDescription(task.projectId, task.id, e.target.value)}
                              placeholder="Add details about this task..."
                              className={`w-full border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                              rows={3}
                            />
                          </div>
                          
                          {/* Attachments */}
                          {task.attachments.length > 0 && (
                            <div className="mt-4">
                              <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Attachments</h4>
                              <ul className="space-y-2">
                                {task.attachments.map((attachment, index) => (
                                  <li key={index} className={`flex items-center rounded px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                    <Paperclip size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                    <span className={`text-sm flex-1 truncate ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{attachment}</span>
                                    <div 
                                      className={`${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'} cursor-pointer`}
                                      onClick={() => removeAttachment(task.projectId, task.id, attachment)}
                                    >
                                      <X size={14} />
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <h3 className="text-lg font-medium">No tasks found</h3>
              <p className={`mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {showAllProjects
                  ? 'No tasks match the current filter'
                  : 'Add your first task to get started'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}