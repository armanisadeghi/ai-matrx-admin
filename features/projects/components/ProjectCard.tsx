'use client';

import React, { useState, useTransition } from 'react';
import {
  Puzzle,
  Users,
  Settings,
  Crown,
  Shield,
  User as UserIcon,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import type { ProjectWithRole } from '@/features/projects';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: ProjectWithRole;
  orgSlug?: string | null;
  onUpdate?: () => void;
  isAnyNavigating?: boolean;
}

export function ProjectCard({ project, orgSlug, onUpdate, isAnyNavigating }: ProjectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);

  const isNavigating = isPending || navigating;
  const isDisabled = isNavigating || isAnyNavigating;

  const getRoleDisplay = () => {
    switch (project.role) {
      case 'owner':
        return {
          icon: <Crown className="h-3 w-3" />,
          label: 'Owner',
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        };
      case 'admin':
        return {
          icon: <Shield className="h-3 w-3" />,
          label: 'Admin',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        };
      default:
        return {
          icon: <UserIcon className="h-3 w-3" />,
          label: 'Member',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const roleDisplay = getRoleDisplay();
  const canManage = project.role === 'owner' || project.role === 'admin';

  const handleNavigate = (path: string) => {
    if (isDisabled) return;
    setNavigating(true);
    startTransition(() => router.push(path));
  };

  const basePath = orgSlug ? `/org/${orgSlug}/projects` : '/projects';
  const projectPath = `${basePath}/${project.slug ?? project.id}`;
  const settingsPath = `${projectPath}/settings`;

  return (
    <Card
      className={cn(
        'p-5 transition-all duration-200 hover:shadow-md cursor-pointer group relative',
        isNavigating && 'opacity-50 pointer-events-none'
      )}
      onClick={() => handleNavigate(projectPath)}
    >
      {isNavigating && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Puzzle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-base font-semibold text-foreground truncate">{project.name}</h3>
                <Badge className={cn('flex items-center gap-1 text-xs', roleDisplay.color)}>
                  {roleDisplay.icon}
                  {roleDisplay.label}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>
                {project.memberCount === 1 ? '1 member' : `${project.memberCount ?? 0} members`}
              </span>
            </div>
            {project.slug && (
              <span className="text-xs font-mono text-muted-foreground">/{project.slug}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate(settingsPath);
              }}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate(projectPath);
              }}
              className="text-muted-foreground"
            >
              View
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
