'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, Crown, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserOrganizations } from '@/features/organizations';
import type { OrganizationWithRole } from '@/features/organizations';

/**
 * Compact organization sidebar for org settings layout
 * Shows all user's organizations with the active one highlighted
 */
export function OrgSidebar() {
  const params = useParams();
  const activeOrgId = params.id as string;
  const { organizations, loading } = useUserOrganizations();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Separate personal and team orgs
  const personalOrg = organizations.find((org) => org.isPersonal);
  const teamOrgs = organizations.filter((org) => !org.isPersonal);

  return (
    <nav className="space-y-4">
      {/* Personal Organization */}
      {personalOrg && (
        <div>
          <div className="px-2 mb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Personal
          </div>
          <OrgNavItem org={personalOrg} isActive={personalOrg.id === activeOrgId} />
        </div>
      )}

      {/* Team Organizations */}
      {teamOrgs.length > 0 && (
        <div>
          <div className="px-2 mb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Teams
          </div>
          <div className="space-y-0.5">
            {teamOrgs.map((org) => (
              <OrgNavItem key={org.id} org={org} isActive={org.id === activeOrgId} />
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function OrgNavItem({ org, isActive }: { org: OrganizationWithRole; isActive: boolean }) {
  const RoleIcon = getRoleIcon(org.role, org.isPersonal);
  
  return (
    <Link
      href={`/organizations/${org.id}/settings`}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm',
        'hover:bg-muted',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center',
        org.isPersonal
          ? 'bg-purple-100 dark:bg-purple-900/30'
          : 'bg-blue-100 dark:bg-blue-900/30'
      )}>
        {org.logoUrl ? (
          <img
            src={org.logoUrl}
            alt=""
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <Building2 className={cn(
            'h-3.5 w-3.5',
            org.isPersonal
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-blue-600 dark:text-blue-400'
          )} />
        )}
      </div>
      <span className="flex-1 truncate">{org.name}</span>
      <RoleIcon className={cn(
        'h-3 w-3 flex-shrink-0',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )} />
    </Link>
  );
}

function getRoleIcon(role: string, isPersonal: boolean) {
  if (isPersonal) return UserIcon;
  switch (role) {
    case 'owner': return Crown;
    case 'admin': return Shield;
    default: return UserIcon;
  }
}
