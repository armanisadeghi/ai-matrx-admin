'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Flag, User, Paperclip, MessageSquare, 
  CheckSquare, Loader2, Plus, Send, Save 
} from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskDetailsPanelProps {
  task: any;
  onClose: () => void;
}

export default function TaskDetailsPanel({ task, onClose }: TaskDetailsPanelProps) {
  const {
    updateTaskDescription,
    updateTaskDueDate,
    updateTaskProject,
    projects,
    refresh,
  } = useTaskContext();

  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [projectId, setProjectId] = useState<string | null>(task.projectId || null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(task.priority || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Update local state when task changes from context
  useEffect(() => {
    setDescription(task.description || '');
    setDueDate(task.dueDate || '');
    setProjectId(task.projectId || null);
    setPriority(task.priority || null);
    setSubtasks(task.subtasks || []);
    setIsDirty(false); // Reset dirty state when task updates
  }, [task.id, task.description, task.dueDate, task.projectId, task.priority, task.subtasks]);

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    setIsDirty(true);
  };

  const handleDueDateChange = (newDate: string) => {
    setDueDate(newDate);
    setIsDirty(true);
  };

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    setIsDirty(true);
  };

  const handlePriorityChange = (newPriority: 'low' | 'medium' | 'high') => {
    setPriority(newPriority);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    
    setIsSaving(true);
    try {
      // Save all changes
      if (description !== task.description) {
        await updateTaskDescription(task.projectId, task.id, description);
      }
      if (dueDate !== task.dueDate) {
        await updateTaskDueDate(task.projectId, task.id, dueDate);
      }
      if (projectId !== task.projectId) {
        await updateTaskProject(task.id, projectId);
      }
      // TODO: Save priority when implemented in context
      
      // Refresh to get updated data
      await refresh();
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask = {
      id: Date.now().toString(),
      title: newSubtask,
      completed: false,
    };
    
    setSubtasks([...subtasks, subtask]);
    setNewSubtask('');
    // TODO: Save to database
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    ));
    // TODO: Save to database
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now().toString(),
      content: newComment,
      created_at: new Date().toISOString(),
    };
    
    setComments([...comments, comment]);
    setNewComment('');
    // TODO: Save to database
  };

  const getPriorityColor = (p: string | null) => {
    switch (p) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const totalSubtasks = subtasks.length;

  return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 pr-2">
            {task.title}
          </h2>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="h-8 px-3"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-1" />
                    Save
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Assignee */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
            <User size={14} />
            Assignee
          </label>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
              {task.assigneeName?.[0] || 'U'}
            </div>
            <span>{task.assigneeName || 'Unassigned'}</span>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
            <Calendar size={14} />
            Due Date
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Project */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
            <CheckSquare size={14} />
            Project
          </label>
          <Select value={projectId || 'none'} onValueChange={(val) => handleProjectChange(val === 'none' ? '' : val)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select project">
                {projectId ? projects.find(p => p.id === projectId)?.name : 'No Project'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-gray-500 dark:text-gray-400">No Project</span>
              </SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
            <Flag size={14} />
            Priority
          </label>
          <Select value={priority || 'none'} onValueChange={(val) => handlePriorityChange(val as any)}>
            <SelectTrigger className="text-sm">
              <SelectValue>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(priority)}`}>
                  {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'None'}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  High
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="low">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Low
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Implement the /api/v1/auth/login endpoint using JWT for token generation. Include password hashing with bcrypt."
            className="text-sm resize-none min-h-[100px]"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
            Subtasks
          </label>
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleToggleSubtask(subtask.id)}
                />
                <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {subtask.title}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Write unit tests for endpoint"
                className="text-sm flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAddSubtask}
                className="h-9 w-9"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Activity / Comments */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
            <MessageSquare size={14} />
            Activity
          </label>
          
          {comments.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No comments yet.
            </p>
          )}

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="text-sm flex-1"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
            />
            <Button
              size="icon"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="h-9 w-9"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

