// context/TaskContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { 
  Project, 
  TaskContextType, 
  TaskProviderProps, 
  TaskFilterType,
  TaskWithProject
} from '../types';

// Initial data
const initialProjects: Project[] = [
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
];

// Create context with initial undefined value
const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: TaskProviderProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<number[]>([1, 2]);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [activeProject, setActiveProject] = useState<number | null>(1);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState<TaskFilterType>('all');
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Toggle project expansion
  const toggleProjectExpand = (projectId: number) => {
    setExpandedProjects(
      expandedProjects.includes(projectId)
        ? expandedProjects.filter(id => id !== projectId)
        : [...expandedProjects, projectId]
    );
  };

  // Toggle task expansion for details
  const toggleTaskExpand = (taskId: number) => {
    setExpandedTasks(
      expandedTasks.includes(taskId)
        ? expandedTasks.filter(id => id !== taskId)
        : [...expandedTasks, taskId]
    );
  };

  // Add new project
  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: Date.now(),
      name: newProjectName,
      tasks: []
    };
    
    setProjects([...projects, newProject]);
    setNewProjectName('');
  };

  // Delete project
  const deleteProject = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter(project => project.id !== projectId));
  };

  // Add new task to active project
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || activeProject === null) return;
    
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
  const toggleTaskComplete = (projectId: number, taskId: number) => {
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
  const updateTaskDescription = (projectId: number, taskId: number, description: string) => {
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
  const updateTaskDueDate = (projectId: number, taskId: number, dueDate: string) => {
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
  const deleteTask = (projectId: number, taskId: number, e: React.MouseEvent) => {
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
  const addAttachment = (projectId: number, taskId: number, e: React.MouseEvent) => {
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
  const removeAttachment = (projectId: number, taskId: number, attachmentName: string) => {
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
  const copyTaskToClipboard = (task: TaskWithProject, e: React.MouseEvent) => {
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
  const getFilteredTasks = (): TaskWithProject[] => {
    const today = new Date().toISOString().split('T')[0];
    
    if (showAllProjects) {
      // Flatten all tasks from all projects and apply filter
      let allTasks: TaskWithProject[] = [];
      
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
    } else if (activeProject !== null) {
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
    
    return []; // Return empty array if no active project
  };

  const value: TaskContextType = {
    projects,
    newProjectName,
    expandedProjects,
    expandedTasks,
    activeProject,
    newTaskTitle,
    filter,
    showAllProjects,
    setNewProjectName,
    setNewTaskTitle,
    setActiveProject,
    setFilter,
    setShowAllProjects,
    toggleProjectExpand,
    toggleTaskExpand,
    addProject,
    deleteProject,
    addTask,
    toggleTaskComplete,
    updateTaskDescription,
    updateTaskDueDate,
    deleteTask,
    addAttachment,
    removeAttachment,
    copyTaskToClipboard,
    getFilteredTasks
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext(): TaskContextType {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}