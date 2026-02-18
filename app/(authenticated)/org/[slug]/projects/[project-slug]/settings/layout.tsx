'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Menu, Puzzle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useProject } from '@/features/projects';
import { getOrganizationBySlug } from '@/features/organizations';
import { ProjectSidebar } from '@/features/projects/components/ProjectSidebar';

export default function ProjectSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params.slug as string;
  const projectSlug = params['project-slug'] as string;
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const org = await getOrganizationBySlug(orgSlug);
        if (!org) return;
        setOrgId(org.id);

        const { getProjectBySlug } = await import('@/features/projects');
        const proj = await getProjectBySlug(projectSlug, org.id);
        if (proj) setProjectId(proj.id);
      } catch (err) {
        console.error('Error loading project settings layout:', err);
      }
    }
    load();
  }, [orgSlug, projectSlug]);

  const { project } = useProject(projectId ?? undefined);

  return (
    <div className="h-[calc(100dvh-var(--header-height))] w-full bg-textured overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="h-12 px-3 md:px-4 flex items-center gap-3">
          <Link
            href={`/org/${orgSlug}/projects`}
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

          {isMobile && orgId && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Projects</SheetTitle>
                </SheetHeader>
                <div className="mt-4" onClick={() => setMobileMenuOpen(false)}>
                  <ProjectSidebar organizationId={orgId} orgSlug={orgSlug} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {orgId && (
          <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="p-3 w-full">
              <ProjectSidebar organizationId={orgId} orgSlug={orgSlug} />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
