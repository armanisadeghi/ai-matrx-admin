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
import type { DatabaseTask } from '../types/database';
import * as taskService from '../services/taskService';
import * as projectService from '../services/projectService';

// Create context
const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: TaskProviderProps) {
  const toast = useToastManager('tasks');
  
  // Database state
  const [dbProjectsWithTasks, setDbProjectsWithTasks] = useState<ProjectWithTasks[]>([]);
  const [loading, setLoading] = useState(true); // Start as true, will be set false after initial load
  
  // Operation states for feedback
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [operatingTaskId, setOperatingTaskId] = useState<string | null>(null);
  const [operatingProjectId, setOperatingProjectId] = useState<string | null>(null);
  
  // UI state
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState<TaskFilterType>('all');
  const [showAllProjects, setShowAllProjects] = useState(true); // Default to All Tasks view
  const [showCompleted, setShowCompleted] = useState(false); // Default to hiding completed tasks
  const [searchQuery, setSearchQuery] = useState('');

  // Convert database projects to UI projects with subtasks
  const projects: Project[] = dbProjectsWithTasks.map(dbProject => {
    const allTasks = dbProject.tasks || [];
    
    // Build subtask relationships
    const taskMap = new Map();
    const rootTasks: any[] = [];
    
    // First pass: create all task objects
    allTasks.forEach(dbTask => {
      const task = {
        id: dbTask.id,
        title: dbTask.title,
        completed: dbTask.status === 'completed',
        description: dbTask.description || '',
        attachments: [],
        dueDate: dbTask.due_date || '',
        parentTaskId: dbTask.parent_task_id || null,
        subtasks: [],
      };
      taskMap.set(dbTask.id, task);
    });
    
    // Second pass: organize into parent-child relationships
    allTasks.forEach(dbTask => {
      const task = taskMap.get(dbTask.id);
      if (dbTask.parent_task_id) {
        const parent = taskMap.get(dbTask.parent_task_id);
        if (parent) {
          parent.subtasks.push(task);
        }
      } else {
        rootTasks.push(task);
      }
    });
    
    return {
      id: dbProject.id,
      name: dbProject.name,
      tasks: rootTasks,
    };
  });

  // Load projects with tasks from database - FIXED to prevent infinite loop
  const loadProjectsWithTasks = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      
      const data = await projectService.getProjectsWithTasks();
      setDbProjectsWithTasks(data);
      
      // Auto-expand and select first project if none selected (use functional update to avoid dependency)
      if (data.length > 0) {
        setActiveProject(prev => {
          if (!prev) {
            const firstProjectId = data[0].id;
            setExpandedProjects([firstProjectId]);
            return firstProjectId;
          }
          return prev;
        });
      }
      
      // If no projects exist, ensure default "Personal" project (removed showAllProjects check)
      if (data.length === 0) {
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
  }, [toast]); // ONLY toast as dependency - nothing else!

  // Initial load and real-time subscription - FIXED to prevent infinite loop
  useEffect(() => {
    let isSubscribed = true;
    
    // Initial load
    loadProjectsWithTasks();

    // Subscribe to real-time changes - with proper cleanup
    const channel = supabase
      .channel('task-manager-changes-' + Date.now()) // Unique channel name
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, () => {
        if (isSubscribed) {
          loadProjectsWithTasks(true);
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, () => {
        if (isSubscribed) {
          loadProjectsWithTasks(true);
        }
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, []); // EMPTY array - only run once on mount!

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

  // Add new project with loading state
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreatingProject) return;
    
    setIsCreatingProject(true);
    try {
      const newProject = await projectService.createProject(newProjectName);
      if (newProject) {
        setActiveProject(newProject.id);
        toast.success(`Project "${newProjectName}" created`);
        setNewProjectName('');
        // Force immediate refresh
        await loadProjectsWithTasks(true);
      } else {
        toast.error('Failed to create project');
      }
    } catch (error) {
      console.error('Error in addProject:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Update project with OPTIMISTIC update
  const updateProject = async (projectId: string, name: string) => {
    setOperatingProjectId(projectId);
    
    // Store previous value for rollback
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const previousName = project?.name || '';
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId ? { ...p, name } : p
      )
    );
    
    try {
      const success = await projectService.updateProject(projectId, { name });
      if (success) {
        toast.success('Project updated');
      } else {
        // ROLLBACK
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId ? { ...p, name: previousName } : p
          )
        );
        toast.error('Failed to update project');
      }
    } catch (error) {
      // ROLLBACK
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId ? { ...p, name: previousName } : p
        )
      );
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setOperatingProjectId(null);
    }
  };

  // Update task project (move task to different project) with OPTIMISTIC update
  const updateTaskProject = async (taskId: string, projectId: string | null) => {
    setOperatingTaskId(taskId);
    
    // Find the task in current projects
    let sourceProjectId: string | null = null;
    let taskToMove: DatabaseTask | null = null;
    
    for (const project of dbProjectsWithTasks) {
      const task = project.tasks?.find(t => t.id === taskId);
      if (task) {
        sourceProjectId = project.id;
        taskToMove = task;
        break;
      }
    }
    
    if (!taskToMove) {
      setOperatingTaskId(null);
      toast.error('Task not found');
      return;
    }
    
    // OPTIMISTIC UPDATE: Move task between projects immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => {
        // Remove from source project
        if (p.id === sourceProjectId) {
          return {
            ...p,
            tasks: p.tasks?.filter(t => t.id !== taskId) || []
          };
        }
        // Add to target project
        if (p.id === projectId) {
          return {
            ...p,
            tasks: [...(p.tasks || []), { ...taskToMove, project_id: projectId }]
          };
        }
        return p;
      })
    );
    
    try {
      const success = await taskService.updateTask(taskId, { project_id: projectId });
      if (success) {
        toast.success('Task project updated');
      } else {
        // ROLLBACK: Move task back
        setDbProjectsWithTasks(prev => 
          prev.map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                tasks: p.tasks?.filter(t => t.id !== taskId) || []
              };
            }
            if (p.id === sourceProjectId) {
              return {
                ...p,
                tasks: [...(p.tasks || []), taskToMove]
              };
            }
            return p;
          })
        );
        toast.error('Failed to update task project');
      }
    } catch (error) {
      // ROLLBACK: Move task back
      setDbProjectsWithTasks(prev => 
        prev.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              tasks: p.tasks?.filter(t => t.id !== taskId) || []
            };
          }
          if (p.id === sourceProjectId) {
            return {
              ...p,
              tasks: [...(p.tasks || []), taskToMove]
            };
          }
          return p;
        })
      );
      console.error('Error updating task project:', error);
      toast.error('Failed to update task project');
    } finally {
      setOperatingTaskId(null);
    }
  };

  // Delete project with OPTIMISTIC update
  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (operatingProjectId === projectId) return; // Prevent duplicate operations
    
    setOperatingProjectId(projectId);
    
    // Store project for rollback
    const projectToDelete = dbProjectsWithTasks.find(p => p.id === projectId);
    const wasActiveProject = activeProject === projectId;
    
    if (!projectToDelete) {
      setOperatingProjectId(null);
      return;
    }
    
    // OPTIMISTIC UPDATE: Remove from UI immediately
    setDbProjectsWithTasks(prev => prev.filter(p => p.id !== projectId));
    
    // If deleted project was active, clear selection
    if (wasActiveProject) {
      setActiveProject(null);
    }
    
    try {
      const success = await projectService.deleteProject(projectId);
      
      if (success) {
        toast.success(`Project "${projectToDelete.name}" deleted`);
      } else {
        // ROLLBACK: Restore project
        setDbProjectsWithTasks(prev => [...prev, projectToDelete]);
        if (wasActiveProject) {
          setActiveProject(projectId);
        }
        toast.error('Failed to delete project');
      }
    } catch (error) {
      // ROLLBACK: Restore project
      setDbProjectsWithTasks(prev => [...prev, projectToDelete]);
      if (wasActiveProject) {
        setActiveProject(projectId);
      }
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setOperatingProjectId(null);
    }
  };

  // Add new task with OPTIMISTIC update
  const addTask = async (e: React.FormEvent, description?: string, dueDate?: string, targetProjectId?: string): Promise<string | null> => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isCreatingTask) return null;
    
    const projectId = targetProjectId || activeProject || null;
    
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: DatabaseTask = {
      id: tempId,
      title: newTaskTitle,
      description: description || null,
      due_date: dueDate || null,
      project_id: projectId,
      parent_task_id: null,
      status: 'incomplete',
      priority: null,
      assignee_id: null,
      user_id: '', // Will be set by server
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      authenticated_read: false,
    };
    
    // OPTIMISTIC UPDATE: Add to UI immediately
    setDbProjectsWithTasks(prev => {
      if (projectId) {
        // Add to specific project
        return prev.map(p => 
          p.id === projectId 
            ? { ...p, tasks: [...(p.tasks || []), optimisticTask] }
            : p
        );
      } else {
        // If no project, we'll create it without a project (shouldn't happen with new UI)
        return prev;
      }
    });
    
    setIsCreatingTask(true);
    try {
      const newTask = await taskService.createTask({
        title: newTaskTitle,
        description: description || null,
        due_date: dueDate || null,
        project_id: projectId,
      });
      
      if (newTask) {
        // SUCCESS: Replace optimistic task with real task from DB
        setDbProjectsWithTasks(prev => 
          prev.map(p => ({
            ...p,
            tasks: p.tasks?.map(t => t.id === tempId ? newTask : t) || []
          }))
        );
        toast.success('Task added');
        setNewTaskTitle('');
        return newTask.id; // Return the created task ID
      } else {
        // FAILURE: Remove optimistic task
        setDbProjectsWithTasks(prev => 
          prev.map(p => ({
            ...p,
            tasks: p.tasks?.filter(t => t.id !== tempId) || []
          }))
        );
        toast.error('Failed to add task');
        return null;
      }
    } catch (error) {
      // ERROR: Remove optimistic task
      setDbProjectsWithTasks(prev => 
        prev.map(p => ({
          ...p,
          tasks: p.tasks?.filter(t => t.id !== tempId) || []
        }))
      );
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
      return null;
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Toggle task completion with OPTIMISTIC update
  const toggleTaskComplete = async (projectId: string, taskId: string) => {
    if (operatingTaskId === taskId) return; // Prevent duplicate operations
    
    setOperatingTaskId(taskId);
    
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const task = project?.tasks?.find(t => t.id === taskId);
    
    if (!task) {
      setOperatingTaskId(null);
      return;
    }
    
    const newStatus = task.status === 'completed' ? 'incomplete' : 'completed';
    const previousStatus = task.status;
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              tasks: p.tasks?.map(t => 
                t.id === taskId ? { ...t, status: newStatus } : t
              ) || []
            }
          : p
      )
    );
    
    try {
      const success = await taskService.updateTask(taskId, {
        status: newStatus,
      });
      
      if (success) {
        toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened');
      } else {
        // ROLLBACK: Revert optimistic update on failure
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId 
              ? { 
                  ...p, 
                  tasks: p.tasks?.map(t => 
                    t.id === taskId ? { ...t, status: previousStatus } : t
                  ) || []
                }
              : p
          )
        );
        toast.error('Failed to update task');
      }
    } catch (error) {
      // ROLLBACK: Revert optimistic update on error
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                tasks: p.tasks?.map(t => 
                  t.id === taskId ? { ...t, status: previousStatus } : t
                ) || []
              }
            : p
        )
      );
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    } finally {
      setOperatingTaskId(null);
    }
  };

  // Update task title with OPTIMISTIC update
  const updateTaskTitle = async (projectId: string, taskId: string, title: string) => {
    setOperatingTaskId(taskId);
    
    // Store previous value for rollback
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const task = project?.tasks?.find(t => t.id === taskId);
    const previousTitle = task?.title || '';
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              tasks: p.tasks?.map(t => 
                t.id === taskId ? { ...t, title } : t
              ) || []
            }
          : p
      )
    );
    
    try {
      const success = await taskService.updateTask(taskId, { title });
      if (success) {
        toast.success('Task title updated');
      } else {
        // ROLLBACK
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId 
              ? { 
                  ...p, 
                  tasks: p.tasks?.map(t => 
                    t.id === taskId ? { ...t, title: previousTitle } : t
                  ) || []
                }
              : p
          )
        );
        toast.error('Failed to update title');
      }
    } catch (error) {
      // ROLLBACK
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                tasks: p.tasks?.map(t => 
                  t.id === taskId ? { ...t, title: previousTitle } : t
                ) || []
              }
            : p
        )
      );
      console.error('Error updating task title:', error);
      toast.error('Failed to update title');
    } finally {
      setOperatingTaskId(null);
    }
  };

  // Update task description with OPTIMISTIC update
  const updateTaskDescription = async (projectId: string, taskId: string, description: string) => {
    setOperatingTaskId(taskId);
    
    // Store previous value for rollback
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const task = project?.tasks?.find(t => t.id === taskId);
    const previousDescription = task?.description || '';
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              tasks: p.tasks?.map(t => 
                t.id === taskId ? { ...t, description } : t
              ) || []
            }
          : p
      )
    );
    
    try {
      const success = await taskService.updateTask(taskId, { description });
      if (success) {
        toast.success('Description updated');
      } else {
        // ROLLBACK
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId 
              ? { 
                  ...p, 
                  tasks: p.tasks?.map(t => 
                    t.id === taskId ? { ...t, description: previousDescription } : t
                  ) || []
                }
              : p
          )
        );
        toast.error('Failed to update description');
      }
    } catch (error) {
      // ROLLBACK
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                tasks: p.tasks?.map(t => 
                  t.id === taskId ? { ...t, description: previousDescription } : t
                ) || []
              }
            : p
        )
      );
      console.error('Error updating description:', error);
      toast.error('Failed to update description');
    } finally {
      setOperatingTaskId(null);
    }
  };

  // Update task due date with OPTIMISTIC update
  const updateTaskDueDate = async (projectId: string, taskId: string, dueDate: string) => {
    setOperatingTaskId(taskId);
    
    // Store previous value for rollback
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const task = project?.tasks?.find(t => t.id === taskId);
    const previousDueDate = task?.due_date || null;
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              tasks: p.tasks?.map(t => 
                t.id === taskId ? { ...t, due_date: dueDate || null } : t
              ) || []
            }
          : p
      )
    );
    
    try {
      const success = await taskService.updateTask(taskId, { due_date: dueDate || null });
      if (success) {
        toast.success('Due date updated');
      } else {
        // ROLLBACK
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId 
              ? { 
                  ...p, 
                  tasks: p.tasks?.map(t => 
                    t.id === taskId ? { ...t, due_date: previousDueDate } : t
                  ) || []
                }
              : p
          )
        );
        toast.error('Failed to update due date');
      }
    } catch (error) {
      // ROLLBACK
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                tasks: p.tasks?.map(t => 
                  t.id === taskId ? { ...t, due_date: previousDueDate } : t
                ) || []
              }
            : p
        )
      );
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    } finally {
      setOperatingTaskId(null);
    }
  };

  // Delete task with OPTIMISTIC update
  const deleteTask = async (projectId: string, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (operatingTaskId === taskId) return; // Prevent duplicate operations
    
    setOperatingTaskId(taskId);
    
    // Store task for rollback
    const project = dbProjectsWithTasks.find(p => p.id === projectId);
    const taskToDelete = project?.tasks?.find(t => t.id === taskId);
    
    if (!taskToDelete) {
      setOperatingTaskId(null);
      return;
    }
    
    // OPTIMISTIC UPDATE: Remove from UI immediately
    setDbProjectsWithTasks(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              tasks: p.tasks?.filter(t => t.id !== taskId) || []
            }
          : p
      )
    );
    
    try {
      const success = await taskService.deleteTask(taskId);
      if (success) {
        toast.success('Task deleted');
      } else {
        // ROLLBACK: Restore task
        setDbProjectsWithTasks(prev => 
          prev.map(p => 
            p.id === projectId 
              ? { 
                  ...p, 
                  tasks: [...(p.tasks || []), taskToDelete]
                }
              : p
          )
        );
        toast.error('Failed to delete task');
      }
    } catch (error) {
      // ROLLBACK: Restore task
      setDbProjectsWithTasks(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                tasks: [...(p.tasks || []), taskToDelete]
              }
            : p
        )
      );
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setOperatingTaskId(null);
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

  // Create subtask with OPTIMISTIC update
  const createSubtask = async (parentTaskId: string, title: string, description?: string) => {
    try {
      const newSubtask = await taskService.createSubtask(parentTaskId, title, description);
      if (newSubtask) {
        toast.success('Subtask created');
        // Refresh to get updated subtasks
        await loadProjectsWithTasks(true);
      } else {
        toast.error('Failed to create subtask');
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error('Failed to create subtask');
    }
  };

  // Update subtask status with OPTIMISTIC update  
  const updateSubtaskStatus = async (subtaskId: string, completed: boolean) => {
    try {
      const success = await taskService.updateSubtaskStatus(subtaskId, completed);
      if (success) {
        // Refresh to get updated subtasks
        await loadProjectsWithTasks(true);
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  // Delete subtask with OPTIMISTIC update
  const deleteSubtaskFunc = async (subtaskId: string) => {
    try {
      const success = await taskService.deleteSubtask(subtaskId);
      if (success) {
        toast.success('Subtask deleted');
        // Refresh to get updated subtasks
        await loadProjectsWithTasks(true);
      } else {
        toast.error('Failed to delete subtask');
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  // Get task comments
  const getTaskComments = async (taskId: string): Promise<any[]> => {
    try {
      return await taskService.getTaskComments(taskId);
    } catch (error) {
      console.error('Error getting task comments:', error);
      return [];
    }
  };

  // Create task comment
  const createTaskComment = async (taskId: string, content: string) => {
    try {
      const newComment = await taskService.createTaskComment(taskId, content);
      if (newComment) {
        toast.success('Comment added');
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error creating task comment:', error);
      toast.error('Failed to add comment');
    }
  };

  // Get filtered tasks with search and completed visibility
  const getFilteredTasks = (): TaskWithProject[] => {
    // Get today's date at midnight local time for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let allTasks: TaskWithProject[] = [];
    
    if (showAllProjects) {
      projects.forEach(project => {
        project.tasks.forEach(task => {
          allTasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name
          });
        });
      });
    } else if (activeProject !== null) {
      const activeProjectData = projects.find(project => project.id === activeProject);
      if (activeProjectData) {
        activeProjectData.tasks.forEach(task => {
          allTasks.push({
            ...task,
            projectId: activeProject,
            projectName: activeProjectData.name
          });
        });
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      allTasks = allTasks.filter(task => {
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.projectName.toLowerCase().includes(query)
        );
      });
    }
    
    // Filter out completed tasks if showCompleted is false (default behavior)
    if (!showCompleted) {
      allTasks = allTasks.filter(task => !task.completed);
    }
    
    // Apply status filter
    switch (filter) {
      case 'incomplete':
        return allTasks.filter(task => !task.completed);
      case 'overdue':
        return allTasks.filter(task => {
          if (task.completed || !task.dueDate) return false;
          // Compare dates consistently - both as YYYY-MM-DD strings
          return task.dueDate < todayStr;
        });
      default:
        return allTasks;
    }
  };

  const value: TaskContextType = {
    projects,
    loading,
    isCreatingProject,
    isCreatingTask,
    operatingTaskId,
    operatingProjectId,
    newProjectName,
    expandedProjects,
    expandedTasks,
    activeProject,
    newTaskTitle,
    filter,
    showAllProjects,
    showCompleted,
    searchQuery,
    setNewProjectName,
    setNewTaskTitle,
    setActiveProject,
    setFilter,
    setShowAllProjects,
    setShowCompleted,
    setSearchQuery,
    toggleProjectExpand,
    toggleTaskExpand,
    addProject,
    updateProject,
    updateTaskProject,
    deleteProject,
    addTask,
    toggleTaskComplete,
    updateTaskTitle,
    updateTaskDescription,
    updateTaskDueDate,
    deleteTask,
    addAttachment,
    removeAttachment,
    copyTaskToClipboard,
    getFilteredTasks,
    createSubtask,
    updateSubtaskStatus,
    deleteSubtask: deleteSubtaskFunc,
    getTaskComments,
    createTaskComment,
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
