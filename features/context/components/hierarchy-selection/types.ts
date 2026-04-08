import type { HierarchyNodeType } from "../../service/hierarchyService";

export type HierarchyLevel = "organization" | "project" | "task";

export interface HierarchySelection {
  organizationId: string | null;
  organizationName: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskName: string | null;
}

export interface HierarchyOption {
  id: string;
  name: string;
  description?: string | null;
  isPersonal?: boolean;
  role?: string;
  status?: string | null;
}

export interface HierarchySelectionProps {
  levels?: HierarchyLevel[];
  value: HierarchySelection;
  onChange: (selection: HierarchySelection) => void;
  disabled?: boolean;
  className?: string;
}

export interface UseHierarchySelectionReturn {
  orgs: HierarchyOption[];
  projects: HierarchyOption[];
  tasks: HierarchyOption[];
  isLoading: boolean;
  isError: boolean;
  selection: HierarchySelection;
  setOrg: (id: string | null) => void;
  setProject: (id: string | null) => void;
  setTask: (id: string | null) => void;
  clear: () => void;
}

export const EMPTY_SELECTION: HierarchySelection = {
  organizationId: null,
  organizationName: null,
  projectId: null,
  projectName: null,
  taskId: null,
  taskName: null,
};

export const LEVEL_CONFIG: Record<
  HierarchyLevel,
  { label: string; pluralLabel: string; iconName: string; accent: string }
> = {
  organization: {
    label: "Organization",
    pluralLabel: "Organizations",
    iconName: "Building2",
    accent: "text-violet-500",
  },
  project: {
    label: "Project",
    pluralLabel: "Projects",
    iconName: "FolderKanban",
    accent: "text-amber-500",
  },
  task: {
    label: "Task",
    pluralLabel: "Tasks",
    iconName: "ListTodo",
    accent: "text-sky-500",
  },
};
