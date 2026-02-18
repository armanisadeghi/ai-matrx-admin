'use client';

import React from 'react';
import { Puzzle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { OrgResourceLayout } from '../OrgResourceLayout';
import { ProjectList } from '@/features/projects/components/ProjectList';
import { useOrganization } from '@/features/organizations';
import { getOrganizationBySlug, getUserRole } from '@/features/organizations';
import { Loader2 } from 'lucide-react';

/**
 * Organization Projects Page
 * Route: /org/[slug]/projects
 */
export default function OrgProjectsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [userOrgRole, setUserOrgRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const org = await getOrganizationBySlug(slug);
        if (!org) return;
        setOrgId(org.id);
        const role = await getUserRole(org.id);
        setUserOrgRole(role);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const canCreate = userOrgRole === 'owner' || userOrgRole === 'admin';

  return (
    <OrgResourceLayout
      resourceName="Projects"
      icon={<Puzzle className="h-4 w-4" />}
    >
      {loading || !orgId ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProjectList
          organizationId={orgId}
          orgSlug={slug}
          canCreate={canCreate}
        />
      )}
    </OrgResourceLayout>
  );
}
