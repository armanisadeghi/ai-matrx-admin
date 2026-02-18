"use client";
/**
 * Project Hooks
 *
 * React hooks for project management in components.
 * Mirrors features/organizations/hooks.ts
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Project,
  ProjectWithRole,
  ProjectMemberWithUser,
  ProjectInvitation,
  ProjectInvitationWithProject,
  ProjectRole,
  CreateProjectOptions,
  UpdateProjectOptions,
  InviteProjectMemberOptions,
} from './types';
import {
  getOrgProjects,
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
  leaveProject,
  getProjectUserRole,
  getProjectInvitations,
  inviteToProject,
  cancelProjectInvitation,
  resendProjectInvitation,
  getUserProjectInvitations,
  acceptProjectInvitation,
  isProjectSlugAvailable,
} from './service';

// ============================================================================
// Project Listing Hooks
// ============================================================================

export function useOrgProjects(organizationId: string | undefined) {
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!organizationId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getOrgProjects(organizationId);
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects };
}

export function useUserProjects() {
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProjects();
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects };
}

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, loading, error, refresh: fetchProject };
}

// ============================================================================
// Project CRUD Hooks
// ============================================================================

export function useProjectOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (options: CreateProjectOptions) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createProject(options);
      if (!result.success) setError(result.error ?? 'Failed to create project');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (projectId: string, updates: UpdateProjectOptions) => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateProject(projectId, updates);
      if (!result.success) setError(result.error ?? 'Failed to update project');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update project';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteProject(projectId);
      if (!result.success) setError(result.error ?? 'Failed to delete project');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, loading, error };
}

// ============================================================================
// Member Management Hooks
// ============================================================================

export function useProjectMembers(projectId: string | undefined) {
  const [members, setMembers] = useState<ProjectMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!projectId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refresh: fetchMembers };
}

export function useProjectMemberOperations(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshMembers } = useProjectMembers(projectId);

  const updateRole = useCallback(
    async (userId: string, newRole: ProjectRole) => {
      setLoading(true);
      setError(null);
      try {
        const result = await updateProjectMemberRole(projectId, userId, newRole);
        if (!result.success) setError(result.error ?? 'Failed to update member role');
        else await refreshMembers();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update member role';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [projectId, refreshMembers]
  );

  const remove = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await removeProjectMember(projectId, userId);
        if (!result.success) setError(result.error ?? 'Failed to remove member');
        else await refreshMembers();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to remove member';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [projectId, refreshMembers]
  );

  const leave = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await leaveProject(projectId);
      if (!result.success) setError(result.error ?? 'Failed to leave project');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to leave project';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { updateRole, remove, leave, loading, error };
}

export function useProjectUserRole(projectId: string | undefined) {
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!projectId) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const userRole = await getProjectUserRole(projectId);
      setRole(userRole);
      setLoading(false);
    };
    fetchRole();
  }, [projectId]);

  return {
    role,
    loading,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    canManageMembers: role === 'admin' || role === 'owner',
    canManageSettings: role === 'admin' || role === 'owner',
    canDelete: role === 'owner',
  };
}

// ============================================================================
// Invitation Hooks
// ============================================================================

export function useProjectInvitations(projectId: string | undefined) {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!projectId) {
      setInvitations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectInvitations(projectId);
      setInvitations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch invitations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return { invitations, loading, error, refresh: fetchInvitations };
}

export function useProjectInvitationOperations(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshInvitations } = useProjectInvitations(projectId);

  const invite = useCallback(
    async (options: Omit<InviteProjectMemberOptions, 'projectId'>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await inviteToProject({ ...options, projectId });
        if (!result.success) setError(result.error ?? 'Failed to send invitation');
        else await refreshInvitations();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to send invitation';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [projectId, refreshInvitations]
  );

  const cancel = useCallback(
    async (invitationId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await cancelProjectInvitation(invitationId);
        if (!result.success) setError(result.error ?? 'Failed to cancel invitation');
        else await refreshInvitations();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to cancel invitation';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [refreshInvitations]
  );

  const resend = useCallback(
    async (invitationId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await resendProjectInvitation(invitationId);
        if (!result.success) setError(result.error ?? 'Failed to resend invitation');
        else await refreshInvitations();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to resend invitation';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [refreshInvitations]
  );

  return { invite, cancel, resend, loading, error };
}

export function useUserProjectInvitations() {
  const [invitations, setInvitations] = useState<ProjectInvitationWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProjectInvitations();
      setInvitations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch invitations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const accept = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await acceptProjectInvitation(token);
        if (!result.success) setError(result.error ?? 'Failed to accept invitation');
        else await fetchInvitations();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to accept invitation';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [fetchInvitations]
  );

  return { invitations, loading, error, accept, refresh: fetchInvitations };
}

// ============================================================================
// Utility Hooks
// ============================================================================

export function useProjectSlugAvailability(
  slug: string,
  organizationId: string,
  debounceMs = 500
) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!slug || slug.trim().length === 0 || !organizationId) {
      setAvailable(null);
      return;
    }

    setChecking(true);

    const timer = setTimeout(async () => {
      const isAvailable = await isProjectSlugAvailable(slug, organizationId);
      setAvailable(isAvailable);
      setChecking(false);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      setChecking(false);
    };
  }, [slug, organizationId, debounceMs]);

  return { available, checking };
}
