// ShellIcon.tsx — Server component icon renderer
// Maps icon name strings to Lucide React components without requiring JSX in data files

import {
  BookOpen,
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
  Webhook,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  BookOpen,
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
  Webhook,
};

interface ShellIconProps extends LucideProps {
  name: string;
}

export default function ShellIcon({ name, ...props }: ShellIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
