'use client';

import React, { JSX } from 'react';
import { FolderPlus, X, Loader2, Inbox, Calendar, CheckCircle, AlertCircle, Layers, Eye, EyeOff } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { TaskFilterType } from '@/features/tasks/types';
import EditableProjectName from './EditableProjectName';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function Sidebar(): JSX.Element {
  const {
    projects,
    newProjectName,
    activeProject,
    showAllProjects,
    showCompleted,
    isCreatingProject,
    operatingProjectId,
    loading,
    setNewProjectName,
    setActiveProject,
    setShowAllProjects,
    setShowCompleted,
    addProject,
    deleteProject,
    updateProject,
    setFilter,
    filter
  } = useTaskContext();

  const handleFilterClick = (filterType: TaskFilterType) => {
    setFilter(filterType);
    if (!showAllProjects && !activeProject) {
      setShowAllProjects(true);
    }
  };

  const getFilterIcon = (filterType: TaskFilterType) => {
    switch (filterType) {
      case 'all': return <Inbox size={16} />;
      case 'incomplete': return <Circle size={16} />;
      case 'overdue': return <AlertCircle size={16} />;
    }
  };

  const Circle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Tasks</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Views Section */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Views</h2>
          <div className="space-y-1">
            <button
              onClick={() => {
                setShowAllProjects(true);
                setFilter('all');
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                showAllProjects && filter === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <Layers size={16} />
              <span>All Tasks</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Filters</h2>
          <div className="space-y-1">
            {(['incomplete', 'overdue'] as TaskFilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => handleFilterClick(filterType)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  filter === filterType
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {getFilterIcon(filterType)}
                <span className="capitalize">{filterType}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Show Completed Toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Display</h2>
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted">
            <div className="flex items-center gap-2">
              {showCompleted ? (
                <Eye size={16} className="text-muted-foreground" />
              ) : (
                <EyeOff size={16} className="text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">Show Completed</span>
            </div>
            <Switch
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">Projects</h2>
          </div>

          {/* Add Project Form */}
          <form onSubmit={addProject} className="mb-3">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project..."
                disabled={isCreatingProject}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="submit"
                disabled={!newProjectName.trim() || isCreatingProject}
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex-shrink-0"
              >
                {isCreatingProject ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FolderPlus size={16} />
                )}
              </Button>
            </div>
          </form>

          {/* Projects List */}
          <div className="space-y-1">
            {projects.map(project => {
              const isOperating = operatingProjectId === project.id;
              const isActive = activeProject === project.id && !showAllProjects;
              
              return (
                <div key={project.id} className="relative">
                  {isOperating && (
                    <div className="absolute inset-0 bg-card/50 backdrop-blur-sm z-10 rounded-md flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                  <div
                    onClick={() => {
                      if (!isOperating) {
                        setActiveProject(project.id);
                        setShowAllProjects(false);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent'
                    } ${isOperating ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <EditableProjectName
                      name={project.name}
                      onSave={async (newName) => {
                        await updateProject(project.id, newName);
                      }}
                    />
                    <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                      {project.tasks.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id, e);
                      }}
                      disabled={isOperating}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {projects.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No projects yet.<br/>Create one above!
            </p>
          )}
          
          {projects.length === 0 && loading && (
            <div className="space-y-2 animate-pulse">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-8 bg-muted rounded" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
