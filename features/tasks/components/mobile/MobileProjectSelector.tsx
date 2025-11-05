'use client';

import React, { useState } from 'react';
import { ChevronRight, FolderPlus, Loader2, X, Folder } from 'lucide-react';
import { useTaskContext } from '@/features/tasks/context/TaskContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MobileProjectSelectorProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}

export default function MobileProjectSelector({
  selectedProjectId,
  onSelectProject,
}: MobileProjectSelectorProps) {
  const {
    projects,
    newProjectName,
    setNewProjectName,
    addProject,
    isCreatingProject,
    loading,
  } = useTaskContext();

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProject(e);
    setShowAddForm(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Select Project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a project to view its tasks
        </p>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one below!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`w-full flex items-center gap-3 p-4 text-left active:bg-muted/50 transition-colors ${
                  selectedProjectId === project.id ? 'bg-primary/10' : ''
                }`}
              >
                <Folder size={20} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-foreground truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {project.tasks?.length || 0} {project.tasks?.length === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
                {selectedProjectId === project.id && (
                  <ChevronRight size={20} className="text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Project Section */}
      <div className="flex-shrink-0 border-t border-border pt-4">
        {showAddForm ? (
          <form onSubmit={handleAddProject} className="space-y-2">
            <Input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              disabled={isCreatingProject}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewProjectName('');
                }}
                className="flex-1"
                disabled={isCreatingProject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newProjectName.trim() || isCreatingProject}
                className="flex-1"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <FolderPlus size={18} className="mr-2" />
            New Project
          </Button>
        )}
      </div>
    </div>
  );
}

