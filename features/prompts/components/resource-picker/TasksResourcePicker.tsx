"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, Loader2, CheckSquare, Circle, CheckCircle2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectsWithTasks } from "@/features/tasks/hooks/useTaskManager";
import type { ProjectWithTasks, DatabaseTask } from "@/features/tasks/types";

interface TasksResourcePickerProps {
    onBack: () => void;
    onSelect: (selection: { type: 'task' | 'project'; data: DatabaseTask | ProjectWithTasks }) => void;
}

export function TasksResourcePicker({ onBack, onSelect }: TasksResourcePickerProps) {
    const { projects, loading } = useProjectsWithTasks();
    const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return projects;
        const query = searchQuery.toLowerCase();
        return projects.filter(project => 
            project.name.toLowerCase().includes(query) ||
            project.tasks?.some(task => 
                task.title.toLowerCase().includes(query) || 
                task.description?.toLowerCase().includes(query)
            )
        );
    }, [projects, searchQuery]);

    // Filter tasks by search
    const filteredTasks = useMemo(() => {
        if (!selectedProject) return [];
        const tasks = selectedProject.tasks || [];
        if (!searchQuery.trim()) return tasks;
        const query = searchQuery.toLowerCase();
        return tasks.filter(task => 
            task.title.toLowerCase().includes(query) || 
            task.description?.toLowerCase().includes(query)
        );
    }, [selectedProject, searchQuery]);

    // Count tasks per project (incomplete/total)
    const getProjectTaskCount = (project: ProjectWithTasks) => {
        const tasks = project.tasks || [];
        const incomplete = tasks.filter(t => t.status !== 'completed').length;
        const total = tasks.length;
        return { incomplete, total };
    };

    // Get priority badge color
    const getPriorityColor = (priority?: 'low' | 'medium' | 'high' | null) => {
        if (!priority) return 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400';
        switch (priority) {
            case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
            case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
            case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
        }
    };

    return (
        <div className="flex flex-col h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={selectedProject ? () => setSelectedProject(null) : onBack}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {selectedProject ? selectedProject.name : "Tasks"}
                </span>
                {selectedProject && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => onSelect({ type: 'project', data: selectedProject })}
                    >
                        Add All
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-7 text-xs pl-7 pr-2 bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-gray-700"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : selectedProject ? (
                    // Show tasks in project
                    <div className="p-1">
                        {filteredTasks.length === 0 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                                {searchQuery ? "No tasks found" : "No tasks in this project"}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredTasks.map((task) => {
                                    const isCompleted = task.status === 'completed';
                                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;
                                    
                                    return (
                                        <button
                                            key={task.id}
                                            onClick={() => onSelect({ type: 'task', data: task })}
                                            className="w-full text-left px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group"
                                        >
                                            <div className="flex items-start gap-2">
                                                {isCompleted ? (
                                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-500 mt-0.5" />
                                                ) : (
                                                    <Circle className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 mt-0.5" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs font-medium truncate mb-0.5 ${
                                                        isCompleted 
                                                            ? 'text-gray-500 dark:text-gray-400 line-through' 
                                                            : 'text-gray-900 dark:text-gray-100'
                                                    }`}>
                                                        {task.title}
                                                    </div>
                                                    {task.description && (
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 leading-tight mb-1">
                                                            {task.description}
                                                        </div>
                                                    )}
                                                    <div className="flex gap-1 flex-wrap items-center">
                                                        {task.priority && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                                                                {task.priority}
                                                            </span>
                                                        )}
                                                        {task.due_date && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                                                isOverdue 
                                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                                                    : 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    // Show projects
                    <div className="p-1">
                        {filteredProjects.length === 0 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                                {searchQuery ? "No projects found" : "No projects yet"}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredProjects.map((project) => {
                                    const { incomplete, total } = getProjectTaskCount(project);
                                    
                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => setSelectedProject(project)}
                                            className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group"
                                        >
                                            <FolderKanban 
                                                className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-500"
                                            />
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {project.name}
                                                </div>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {incomplete > 0 ? `${incomplete} pending` : 'All complete'} · {total} total
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

