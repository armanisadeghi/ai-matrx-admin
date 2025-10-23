// Task Context with Database Integration
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useToastManager } from '@/hooks/useToastManager';
import type { 
  TaskContextType, 
  TaskProviderProps, 
  TaskFilterType,
  TaskWithProject,
  Project,
  ProjectWithTasks
} from '../types';
import * as taskService from '../services/taskService';
import * as projectService from '../services/projectService';

// Create context
const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: TaskProviderProps) {
  const toast = useToastManager('tasks');
  
  // Database state
  const [dbProjectsWithTasks, setDbProjectsWithTasks] = useState<ProjectWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState<TaskFilterType>('all');
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Convert database projects to UI projects
  const projects: Project[] = dbProjectsWithTasks.map(dbProject => ({
    id: dbProject.id,
    name: dbProject.name,
    tasks: (dbProject.tasks || []).map(dbTask => ({
      id: dbTask.id,
      title: dbTask.title,
      completed: dbTask.status === 'completed',
      description: dbTask.description || '',
      attachments: [],
      dueDate: dbTask.due_date || '',
    })),
  }));

  // Load projects with tasks from database
  const loadProjectsWithTasks = useCallback(async () => {
    try {
      const data = await projectService.getProjectsWithTasks();
      setDbProjectsWithTasks(data);
      
      // Auto-expand and select first project if none selected
      if (data.length > 0 && !activeProject) {
        const firstProjectId = data[0].id;
        setExpandedProjects([firstProjectId]);
        setActiveProject(firstProjectId);
      }
      
      // If no projects exist, ensure default "Personal" project
      if (data.length === 0 && !showAllProjects) {
        const defaultProject = await projectService.ensureDefaultProject();
        if (defaultProject) {
          // Reload to get the new project
          const updatedData = await projectService.getProjectsWithTasks();
          setDbProjectsWithTasks(updatedData);
          if (updatedData.length > 0) {
            setActiveProject(updatedData[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [activeProject, showAllProjects, toast]);

  // Initial load and real-time subscription
  useEffect(() => {
    loadProjectsWithTasks();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('task-manager-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjectsWithTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadProjectsWithTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjectsWithTasks]);

  // Toggle project expansion
  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(
      expandedProjects.includes(projectId)
        ? expandedProjects.filter(id => id !== projectId)
        : [...expandedProjects, projectId]
    );
  };

  // Toggle task expansion for details
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(
      expandedTasks.includes(taskId)
        ? expandedTasks.filter(id => id !== taskId)
        : [...expandedTasks, taskId]
    );
  };

  // Add new project
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const newProject = await projectService.createProject(newProjectName);
    if (newProject) {
      setActiveProject(newProject.id);
      toast.success(`Project "${newProjectName}" created`);
      // Force immediate refresh
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to create project');
    }
    setNewProjectName('');
  };

  // Delete project
  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    const success = await projectService.deleteProject(projectId);
    
    if (success) {
      toast.success(`Project "${project?.name}" deleted`);
      // If deleted project was active, clear selection
      if (activeProject === projectId) {
        setActiveProject(null);
      }
      // Force immediate refresh
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to delete project');
    }
  };

  // Add new task - can be to a project or standalone
  const addTask = async (e: React.FormEvent, description?: string, dueDate?: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask = await taskService.createTask({
      title: newTaskTitle,
      description: description || null,
      due_date: dueDate || null,
      project_id: activeProject || null,
    });
    
    if (newTask) {
      toast.success('Task added');
      setNewTaskTitle('');
      // Force immediate refresh
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to add task');
    }
  };

  // Toggle task completion
  const toggleTaskComplete = async (projectId: string, taskId: string) => {
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const task = project?.tasks?.find(t => t.id === taskId);
    
    if (task) {
      const newStatus = task.status === 'completed' ? 'incomplete' : 'completed';
      const success = await taskService.updateTask(taskId, {
        status: newStatus,
      });
      
      if (success) {
        toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened');
        // Force immediate refresh
        await loadProjectsWithTasks();
      } else {
        toast.error('Failed to update task');
      }
    }
  };

  // Update task description
  const updateTaskDescription = async (projectId: string, taskId: string, description: string) => {
    const success = await taskService.updateTask(taskId, { description });
    if (success) {
      toast.success('Description updated');
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to update description');
    }
  };

  // Update task due date
  const updateTaskDueDate = async (projectId: string, taskId: string, dueDate: string) => {
    const success = await taskService.updateTask(taskId, { due_date: dueDate || null });
    if (success) {
      toast.success('Due date updated');
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to update due date');
    }
  };

  // Delete task
  const deleteTask = async (projectId: string, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await taskService.deleteTask(taskId);
    if (success) {
      toast.success('Task deleted');
      await loadProjectsWithTasks();
    } else {
      toast.error('Failed to delete task');
    }
  };

  // Add attachment to task
  const addAttachment = (projectId: string, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('File attachments coming soon!');
  };

  // Remove attachment from task
  const removeAttachment = (projectId: string, taskId: string, attachmentName: string) => {
    toast.info('File attachments coming soon!');
  };

  // Copy task to clipboard
  const copyTaskToClipboard = async (task: TaskWithProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const taskText = `${task.title}${task.description ? `\n${task.description}` : ''}${task.dueDate ? `\nDue: ${task.dueDate}` : ''}`;
    
    try {
      await navigator.clipboard.writeText(taskText);
      toast.success('Task copied to clipboard');
    } catch (err) {
      console.error('Could not copy text:', err);
      toast.error('Failed to copy task');
    }
  };

  // Get filtered tasks
  const getFilteredTasks = (): TaskWithProject[] => {
    const today = new Date().toISOString().split('T')[0];
    
    if (showAllProjects) {
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
      const activeProjectData = projects.find(project => project.id === activeProject);
      
      if (!activeProjectData) return [];
      
      const mapTask = (task: typeof activeProjectData.tasks[0]) => ({
        ...task, 
        projectId: activeProject,
        projectName: activeProjectData.name
      });
      
      switch (filter) {
        case 'completed':
          return activeProjectData.tasks.filter(task => task.completed).map(mapTask);
        case 'incomplete':
          return activeProjectData.tasks.filter(task => !task.completed).map(mapTask);
        case 'overdue':
          return activeProjectData.tasks.filter(task => 
            !task.completed && task.dueDate && task.dueDate < today
          ).map(mapTask);
        default:
          return activeProjectData.tasks.map(mapTask);
      }
    }
    
    return [];
  };

  const value: TaskContextType = {
    projects,
    loading,
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
    getFilteredTasks,
    refresh: loadProjectsWithTasks,
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
