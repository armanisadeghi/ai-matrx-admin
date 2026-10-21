// features/memory/memory-hub-sections.ts
//
// The sections of Matrx Memory as the /memory hub shows them, in the order of
// the app-frame tree (common-docs/projects/app-frame/TREE.md › Memory). Every
// door is a real page; the menu (features/shell/constants/nav-data.ts, top item
// "knowledge" labelled Memory) follows the same sections.

import type { ModuleDoor } from "@/features/auth/components/module-landing/ModuleDoors";
import {
  Activity,
  Archive,
  Atom,
  BookmarkCheck,
  BookOpen,
  Boxes,
  Brain,
  CircleHelp,
  ClipboardCopy,
  Code2,
  Database,
  Eye,
  FileCheck2,
  FileInput,
  FileText,
  FlaskConical,
  FolderOpen,
  GitBranch,
  Globe,
  History,
  Inbox,
  Library,
  ListChecks,
  Mic,
  Network,
  Newspaper,
  Radar,
  Search,
  Shapes,
  ShieldCheck,
  Sigma,
  Table,
  Tags,
  TestTubes,
  TextSearch,
  UserRound,
  Video,
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
      { href: "/knowledge/hub", label: "Search your knowledge", hint: "Open the quick search window (Cmd-K)", icon: Search, action: "open-knowledge-search" },
      { href: "/knowledge/hub", label: "Copy a result for AI", hint: "Open a result, then copy it for an AI", icon: ClipboardCopy },
      { href: "/knowledge/search", label: "Search Lab", hint: "Test a search and see why each hit ranked", icon: FlaskConical },
      { href: "/search", label: "Search", hint: "Search the web and what you keep", icon: Search },
      { href: "/scraper/search", label: "Web search lab", hint: "Try a web search and see the pages", icon: Globe },
      { href: "/knowledge/hub", label: "Check an answer against sources", hint: "Soon: check each claim in an answer", icon: FileCheck2, comingSoonId: "memory.claim-check" },
      { href: "/knowledge/search", label: "Preview how a search is widened", hint: "Soon: see the words a search adds", icon: TextSearch, comingSoonId: "memory.query-expansion" },
      { href: "/knowledge/search", label: "See how search chose where to look", hint: "Soon: see which sources it picked", icon: GitBranch, comingSoonId: "memory.search-decision" },
      { href: "/knowledge/search", label: "Test how well search finds things", hint: "Soon: score saved questions", icon: ListChecks, comingSoonId: "memory.retrieval-tests" },
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
      { href: "/memory/agent-memory", label: "How my memory formed", hint: "Soon: see where each memory came from", icon: History, comingSoonId: "memory.formation" },
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
      { href: "/news", label: "News", hint: "Top headlines and curated feeds", icon: Newspaper },
      { href: "/knowledge/library-catalog", label: "Library catalog", hint: "Curated packs you can subscribe to", icon: BookOpen },
      { href: "/knowledge/library-curate", label: "Curate library", hint: "Choose what goes in the library", icon: BookmarkCheck },
      { href: "/libraries", label: "Media source catalog", hint: "Catalog a whole YouTube channel", icon: Video },
      { href: "/transcripts", label: "Transcripts", hint: "Recordings and their transcripts", icon: Mic },
      { href: "/knowledge/library", label: "Sources", hint: "Every source and its status", icon: FileText },
      { href: "/acquisition", label: "Acquisition console", hint: "Ingestion runs and blocks", icon: Radar },
      { href: "/acquisition", label: "Watch a source being added", hint: "Soon: see each step as it runs", icon: Activity, comingSoonId: "memory.ingest-progress" },
      { href: "/knowledge/extractions", label: "Extractions", hint: "Datasets pulled from pages", icon: Table },
      { href: "/knowledge/data-stores", label: "Data stores", hint: "Collections of sources", icon: Database },
    ],
  },
  {
    id: "capture",
    title: "Capture",
    doors: [
      { href: "/memory/capture", label: "Capture", hint: "Bring files, apps and pages in", icon: Inbox },
      { href: "/exports", label: "Bring your export", hint: "Drop an export from another AI app", icon: FileInput },
    ],
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
      { href: "/knowledge", label: "Knowledge overview", hint: "How the knowledge system works", icon: Shapes },
      { href: "/knowledge/about", label: "About Knowledge", hint: "What each part of the system does", icon: CircleHelp },
      { href: "/knowledge/admin", label: "Knowledge admin map", hint: "Every knowledge page, table and agent", icon: ShieldCheck },
      { href: "/dictionary/admin", label: "Dictionary admin map", hint: "Where the custom dictionary is used", icon: Library },
      { href: "/compare/old", label: "Old pages to review", hint: "Old pages kept beside the new ones", icon: FolderOpen },
    ],
  },
];
