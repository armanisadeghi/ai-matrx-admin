// features/tasks/components/QuickTasksSheet.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TaskProvider, useTaskContext } from '../context/TaskContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue,
    SelectGroup,
    SelectLabel,
} from '@/components/ui/select';
import { 
    ExternalLink, 
    Plus, 
    Folder, 
    Layers,
    Inbox,
    CheckCircle,
    AlertCircle,
    FolderPlus,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import CompactTaskItem from './CompactTaskItem';
import TaskDetailsPanel from './TaskDetailsPanel';
import type { TaskFilterType } from '../types';

interface QuickTasksSheetProps {
    onClose?: () => void;
    className?: string;
}

const Circle = ({ size, className }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <circle cx="12" cy="12" r="10" />
    </svg>
);

function QuickTasksSheetContent({ className }: { className?: string }) {
    const {
        projects,
        activeProject,
        showAllProjects,
        filter,
        newTaskTitle,
        isCreatingTask,
        loading,
        setActiveProject,
        setShowAllProjects,
        setFilter,
        setNewTaskTitle,
        addTask,
        getFilteredTasks,
        toggleTaskComplete,
    } = useTaskContext();

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [showQuickAddDescription, setShowQuickAddDescription] = useState(false);
    const [quickAddDescription, setQuickAddDescription] = useState('');
    const [selectedProjectForTask, setSelectedProjectForTask] = useState<string | null>(null);
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);

    // Update selected project when activeProject changes
    useEffect(() => {
        if (activeProject) {
            setSelectedProjectForTask(activeProject);
        } else if (projects.length > 0) {
            setSelectedProjectForTask(projects[0].id);
        }
    }, [activeProject, projects]);

    const filteredTasks = getFilteredTasks();

    // Build selector value - format: "view:all" or "filter:incomplete" or "project:id"
    const selectorValue = useMemo(() => {
        if (showAllProjects) {
            return filter === 'all' ? 'view:all' : `filter:${filter}`;
        } else if (activeProject) {
            return `project:${activeProject}`;
        }
        return 'view:all';
    }, [showAllProjects, filter, activeProject]);

    const handleSelectorChange = useCallback((value: string) => {
        const [type, id] = value.split(':');
        
        if (type === 'view') {
            setShowAllProjects(true);
            setFilter('all');
        } else if (type === 'filter') {
            setShowAllProjects(true);
            setFilter(id as TaskFilterType);
        } else if (type === 'project') {
            setShowAllProjects(false);
            setActiveProject(id);
        }
    }, [setShowAllProjects, setFilter, setActiveProject]);

    const handleAddTask = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedProjectForTask) return;

        const newTaskId = await addTask(e, quickAddDescription.trim(), '', selectedProjectForTask);
        
        if (newTaskId) {
            setSelectedTaskId(newTaskId);
        }
        
        setQuickAddDescription('');
        setShowQuickAddDescription(false);
    }, [newTaskTitle, selectedProjectForTask, quickAddDescription, addTask]);

    const handleTitleChange = useCallback((value: string) => {
        setNewTaskTitle(value);
        if (value.trim() && !showQuickAddDescription) {
            setShowQuickAddDescription(true);
        }
    }, [setNewTaskTitle, showQuickAddDescription]);

    const selectedTask = selectedTaskId
        ? filteredTasks.find(t => t.id === selectedTaskId)
        : null;

    if (loading && projects.length === 0) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading tasks...</div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Compact Header with View/Project Selector */}
            <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <Select value={selectorValue} onValueChange={handleSelectorChange}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select view">
                            {showAllProjects ? (
                                <span className="flex items-center gap-2">
                                    {filter === 'all' ? <Layers className="h-3 w-3" /> : 
                                     filter === 'incomplete' ? <Circle size={12} /> :
                                     filter === 'completed' ? <CheckCircle className="h-3 w-3" /> :
                                     <AlertCircle className="h-3 w-3" />}
                                    <span>
                                        {filter === 'all' ? 'All Tasks' : 
                                         filter === 'incomplete' ? 'Incomplete' :
                                         filter === 'completed' ? 'Completed' :
                                         'Overdue'}
                                    </span>
                                </span>
                            ) : activeProject ? (
                                <span className="flex items-center gap-2">
                                    <Folder className="h-3 w-3 text-zinc-400" />
                                    <span>{projects.find(p => p.id === activeProject)?.name}</span>
                                </span>
                            ) : (
                                'Select view'
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                        <SelectGroup>
                            <SelectLabel className="text-xs font-semibold">Views</SelectLabel>
                            <SelectItem value="view:all" className="text-xs">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-3 w-3" />
                                    <span>All Tasks</span>
                                </div>
                            </SelectItem>
                        </SelectGroup>

                        <SelectGroup>
                            <SelectLabel className="text-xs font-semibold">Filters</SelectLabel>
                            <SelectItem value="filter:incomplete" className="text-xs">
                                <div className="flex items-center gap-2">
                                    <Circle size={12} />
                                    <span>Incomplete</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="filter:completed" className="text-xs">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Completed</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="filter:overdue" className="text-xs">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Overdue</span>
                                </div>
                            </SelectItem>
                        </SelectGroup>

                        {projects.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs font-semibold">Projects</SelectLabel>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={`project:${project.id}`} className="text-xs">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <Folder className="h-3 w-3" />
                                                <span>{project.name}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400">
                                                {project.tasks.length}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                    </SelectContent>
                </Select>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                            >
                                <FolderPlus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Project</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="ml-auto pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.open('/tasks', '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open in New Tab</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Main Content Area - Single View: List OR Details */}
            <div className="flex-1 overflow-hidden">
                {!selectedTask ? (
                    /* Task List View */
                    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
                        {/* Quick Add Task Form */}
                        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                            <form onSubmit={handleAddTask} className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={newTaskTitle}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="Add new task..."
                                        disabled={isCreatingTask || !selectedProjectForTask}
                                        className="flex-1 h-8 text-xs"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!newTaskTitle.trim() || isCreatingTask || !selectedProjectForTask}
                                        className="h-8 w-8 shrink-0"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                
                                {showQuickAddDescription && (
                                    <Textarea
                                        value={quickAddDescription}
                                        onChange={(e) => setQuickAddDescription(e.target.value)}
                                        placeholder="Description (optional)..."
                                        className="text-xs min-h-[60px] resize-none"
                                    />
                                )}
                            </form>
                        </div>

                        {/* Tasks List */}
                        <ScrollArea className="flex-1">
                            <div className="p-1">
                                {filteredTasks.length === 0 ? (
                                    <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-4">
                                        {projects.length === 0 ? 'Create a project to get started' : 'No tasks found'}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredTasks.map((task) => (
                                            <CompactTaskItem
                                                key={task.id}
                                                task={task}
                                                isSelected={false}
                                                onSelect={() => setSelectedTaskId(task.id)}
                                                onToggleComplete={() => toggleTaskComplete(task.projectId, task.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    /* Full Task Details View */
                    <div className="h-full bg-zinc-50 dark:bg-zinc-900">
                        <TaskDetailsPanel
                            task={selectedTask}
                            onClose={() => setSelectedTaskId(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * QuickTasksSheet - Efficient task manager for FloatingSheet
 * Follows the pattern established by QuickNotesSheet
 */
export function QuickTasksSheet({ onClose, className }: QuickTasksSheetProps) {
    return (
        <TaskProvider>
            <QuickTasksSheetContent className={className} />
        </TaskProvider>
    );
}

