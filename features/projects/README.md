# Projects Feature

Organization-scoped project management system. Projects mirror the Organizations feature with full member management, role-based access, and invitation system.

## Architecture

Projects are owned by organizations (not users directly). Access is controlled via `project_members` with role-based RLS policies.

```
organizations → projects → project_members → auth.users
                         ↘ project_invitations → auth.users
                         ↘ tasks
```

## Database Schema

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | text | Required |
| `slug` | text | URL-safe, unique per org |
| `description` | text | Optional |
| `organization_id` | uuid | FK → organizations |
| `created_by` | uuid | FK → auth.users |
| `is_personal` | boolean | Reserved for personal orgs |
| `settings` | jsonb | Extensible config |

### `project_members`
| Column | Type | Notes |
|--------|------|-------|
| `role` | project_role | `owner \| admin \| member` |
| `joined_at` | timestamptz | Auto-set |
| `invited_by` | uuid | FK → auth.users |

### `project_invitations`
Mirrors `organization_invitations` — email-based, token-based, 7-day expiry.

## Role Hierarchy

```
owner > admin > member
```

| Permission | owner | admin | member |
|------------|-------|-------|--------|
| View project | ✅ | ✅ | ✅ |
| Edit settings | ✅ | ✅ | ❌ |
| Manage members | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Delete project | ✅ | ❌ | ❌ |

## RLS Policies

- **projects SELECT**: project member OR org owner/admin
- **projects INSERT**: org member, `created_by = auth.uid()`
- **projects UPDATE/DELETE**: project admin/owner OR org owner/admin
- **project_members**: members see all; admins manage all
- **project_invitations**: admins manage; invitee can read/delete own

## Routes

| Route | Description |
|-------|-------------|
| `/org/[slug]/projects` | List org projects |
| `/org/[slug]/projects/[project-slug]` | Project detail / task view |
| `/org/[slug]/projects/[project-slug]/settings` | Project settings (tabbed) |
| `/settings/projects` | User's projects across all orgs |
| `/project-invitations/accept/[token]` | Accept project invitation |

## Feature Directory

```
features/projects/
├── types.ts           — Project, ProjectWithRole, ProjectMember, ProjectInvitation, ProjectRole
├── service.ts         — CRUD, member management, invitation system
├── hooks.ts           — React hooks for components
├── index.ts           — Barrel exports
└── components/
    ├── ProjectList.tsx
    ├── ProjectCard.tsx
    ├── CreateProjectModal.tsx
    ├── ProjectSettings.tsx    — Tabbed settings (General, Members, Invites, Danger)
    ├── ProjectSidebar.tsx
    ├── GeneralSettings.tsx
    ├── MemberManagement.tsx
    ├── InvitationManager.tsx
    └── DangerZone.tsx
```

## API Routes

- `POST /api/projects/invite` — Create invitation + send email
- `POST /api/projects/invitations/resend` — Resend invitation email

Both require authentication and project admin role (enforced by RLS).

## Key Hooks

```ts
useOrgProjects(organizationId)      // Projects in an org where user is a member
useUserProjects()                   // All user's projects across all orgs
useProject(projectId)               // Single project
useProjectUserRole(projectId)       // Current user's role + permission flags
useProjectMembers(projectId)        // Member list with user details
useProjectMemberOperations(projectId) // updateRole, remove, leave
useProjectInvitations(projectId)    // Invitation list
useProjectInvitationOperations(projectId) // invite, cancel, resend
useProjectSlugAvailability(slug, orgId) // Debounced slug check
```

## Email Templates

Two project-specific templates in `lib/email/client.ts`:
- `emailTemplates.projectInvitation(...)` — Initial invite
- `emailTemplates.projectInvitationReminder(...)` — Resend reminder

## RPC Functions

| Function | Purpose |
|----------|---------|
| `get_project_members_with_users(p_project_id)` | Secure member + user details join |
| `get_user_projects(p_org_id?)` | User's projects with role and member count |
| `auth_is_project_member(project_id)` | RLS policy helper |
| `auth_is_project_admin(project_id)` | RLS policy helper |
| `auth_is_project_owner(project_id)` | RLS policy helper |
