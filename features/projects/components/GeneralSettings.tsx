'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { updateProject, validateProjectName, type Project, type ProjectRole, getRoleLabel } from '@/features/projects';
import { format } from 'date-fns';

interface GeneralSettingsProps {
  project: Project;
  canEdit: boolean;
  userRole: ProjectRole;
}

export function GeneralSettings({ project, canEdit, userRole }: GeneralSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
    setIsEditing(false);
  }, [project]);

  const hasChanges =
    name !== project.name || description !== (project.description ?? '');

  const nameValidation = name
    ? validateProjectName(name)
    : { valid: false, error: 'Name is required' };
  const isFormValid = nameValidation.valid;

  const handleSave = async () => {
    if (!isFormValid) {
      toast.error('Please fix validation errors');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProject(project.id, { name, description: description || undefined });
      if (result.success) {
        toast.success('Project updated successfully');
        setIsEditing(false);
      } else {
        toast.error(result.error ?? 'Failed to update project');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(project.name);
    setDescription(project.description ?? '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">General Settings</h2>
          <p className="text-sm text-muted-foreground">Manage project details</p>
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
        {canEdit && isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || !isFormValid || isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 max-w-xl">
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Project Name</Label>
          {isEditing ? (
            <>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                disabled={isSaving}
                className={!nameValidation.valid ? 'border-red-500' : ''}
              />
              {!nameValidation.valid && (
                <p className="text-xs text-red-600 dark:text-red-400">{nameValidation.error}</p>
              )}
            </>
          ) : (
            <p className="text-sm font-medium">{project.name}</p>
          )}
        </div>

        {project.slug && (
          <div className="space-y-1.5">
            <Label>URL Slug</Label>
            <p className="text-sm font-mono text-muted-foreground">{project.slug}</p>
            <p className="text-xs text-muted-foreground">Slug cannot be changed after creation</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="project-description">Description</Label>
          {isEditing ? (
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isSaving}
              placeholder="What is this project about?"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {project.description ?? 'No description provided'}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Your Role</Label>
          <Badge className="w-fit">{getRoleLabel(userRole)}</Badge>
        </div>

        <div className="space-y-1.5">
          <Label>Created</Label>
          <p className="text-sm text-muted-foreground">
            {format(new Date(project.createdAt), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>
    </div>
  );
}
