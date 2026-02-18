'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Puzzle } from 'lucide-react';
import { useProject } from '@/features/projects';
import { getPersonalProjectBySlug } from '@/features/projects';

export default function PersonalProjectSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectSlug = params['project-slug'] as string;

  const [projectId, setProjectId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const proj = await getPersonalProjectBySlug(projectSlug);
        if (proj) setProjectId(proj.id);
      } catch (err) {
        console.error('Error loading personal project settings layout:', err);
      }
    }
    load();
  }, [projectSlug]);

  const { project } = useProject(projectId ?? undefined);

  return (
    <div className="h-[calc(100dvh-var(--header-height))] w-full bg-textured overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="h-12 px-3 md:px-4 flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Puzzle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <h1 className="text-base font-semibold truncate">
              {project?.name ?? 'Project Settings'}
            </h1>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
