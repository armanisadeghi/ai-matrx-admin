// features/memory/memory-hub-sections.ts
//
// The sections of Matrx Memory as the /memory hub shows them, in the order of
// the app-frame tree (common-docs/projects/app-frame/TREE.md › Memory). Every
// door is a real page; the menu (features/shell/constants/nav-data.ts, top item
// "knowledge" labelled Memory) follows the same sections.

import type { ModuleDoor } from "@/features/auth/components/module-landing/ModuleDoors";
import {
  Archive,
  Atom,
  BookOpen,
  Boxes,
  Brain,
  Code2,
  Database,
  Eye,
  FileText,
  FlaskConical,
  FolderOpen,
  Inbox,
  Network,
  Radar,
  Search,
  Shapes,
  Sigma,
  Table,
  Tags,
  TestTubes,
  UserRound,
  Workflow,
} from "lucide-react";

export interface MemoryHubSection {
  id: string;
  title: string;
  doors: ModuleDoor[];
}

export const MEMORY_HUB_SECTIONS: MemoryHubSection[] = [
  {
    id: "ask",
    title: "Ask & search",
    doors: [
      { href: "/knowledge/hub", label: "Knowledge hub", hint: "One search over everything you keep", icon: Search },
      { href: "/knowledge/search", label: "Search Lab", hint: "Test a search and see why each hit ranked", icon: FlaskConical },
    ],
  },
  {
    id: "topics",
    title: "Topics",
    doors: [
      { href: "/memory/topics", label: "Topics", hint: "Named topics and suggested ones", icon: Tags },
      { href: "/research", label: "Research topics", hint: "Deep research on a topic", icon: BookOpen },
    ],
  },
  {
    id: "everything",
    title: "Everything",
    doors: [
      { href: "/memory/everything", label: "Everything", hint: "Every item in one list", icon: FolderOpen },
      { href: "/memory/my-memory", label: "My memory", hint: "Notes every agent and sandbox can read", icon: UserRound },
      { href: "/memory/agent-memory", label: "Agent memories", hint: "What agents saved about you", icon: Brain },
      { href: "/knowledge", label: "Knowledge overview", hint: "How the knowledge system works", icon: Shapes },
    ],
  },
  {
    id: "concepts",
    title: "Concepts",
    doors: [
      { href: "/memory/concepts", label: "Concepts", hint: "People, places and ideas", icon: Atom },
      { href: "/knowledge/graph", label: "Knowledge graph", hint: "Entities and how they connect", icon: Network },
    ],
  },
  {
    id: "research",
    title: "Research",
    doors: [
      { href: "/research", label: "Research", hint: "Topics, sources and synthesis", icon: BookOpen },
      { href: "/knowledge/library-catalog", label: "Library catalog", hint: "Curated packs you can subscribe to", icon: BookOpen },
      { href: "/knowledge/library", label: "Sources", hint: "Every source and its status", icon: FileText },
      { href: "/acquisition", label: "Acquisition console", hint: "Ingestion runs and blocks", icon: Radar },
      { href: "/knowledge/extractions", label: "Extractions", hint: "Datasets pulled from pages", icon: Table },
      { href: "/knowledge/data-stores", label: "Data stores", hint: "Collections of sources", icon: Database },
    ],
  },
  {
    id: "capture",
    title: "Capture",
    doors: [{ href: "/memory/capture", label: "Capture", hint: "Bring files, apps and pages in", icon: Inbox }],
  },
  {
    id: "forget",
    title: "Forget & archive",
    doors: [{ href: "/memory/trash", label: "Trash", hint: "Deleted sources you can restore", icon: Archive }],
  },
  {
    id: "advanced",
    title: "Advanced",
    doors: [
      { href: "/memory/observational", label: "Memory inspector", hint: "Memory kept for one conversation", icon: Eye },
      { href: "/memory/lab", label: "Memory Lab", hint: "Replay chats through the memory agents", icon: TestTubes },
      { href: "/memory/embeddings", label: "Embedding Lab", hint: "Turn text into vectors and compare", icon: Sigma },
      { href: "/knowledge/flow", label: "Pipeline", hint: "How a source becomes searchable", icon: Workflow },
      { href: "/knowledge/repositories", label: "Repositories", hint: "Code repositories in search", icon: Code2 },
      { href: "/acquisition/blocks", label: "Acquisition blocks", hint: "The steps an ingestion run uses", icon: Boxes },
    ],
  },
];
