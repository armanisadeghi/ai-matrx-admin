// ShellIcon.tsx — Server component icon renderer
// Maps icon name strings to Lucide React components without requiring JSX in data files

import {
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  ListTodo,
  Puzzle,
  FolderOpen,
  Wand2,
  LayoutGrid,
  FlaskConical,
  Mic,
  Table,
  Globe,
  Container,
  Mail,
  Workflow,
  Settings,
  ShieldCheck,
  Database,
  Sparkles,
  Radio,
  LogIn,
  User,
  PanelLeft,
  Menu,
  X,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  ListTodo,
  Puzzle,
  FolderOpen,
  Wand2,
  LayoutGrid,
  FlaskConical,
  Mic,
  Table,
  Globe,
  Container,
  Mail,
  Workflow,
  Settings,
  ShieldCheck,
  Database,
  Sparkles,
  Radio,
  LogIn,
  User,
  PanelLeft,
  Menu,
  X,
};

interface ShellIconProps extends LucideProps {
  name: string;
}

export default function ShellIcon({ name, ...props }: ShellIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
