import {
    Folder,
    Code2,
    Briefcase,
    GraduationCap,
    FileText,
    Calendar,
    Heart,
    Settings,
    Users,
    BookOpen,
    Lightbulb,
    Target,
    Receipt,
    LineChart,
    Mail,
    Image,
    Music,
    Video,
    Shield,
    Link,
    Archive,
    Star,
    Clock,
    Cloud,
    FileCheck,
    Bookmark,
    Pencil,
    Trash2,
    Download,
    Share2,
    Database,
    // Technical documentation icons
    FileCode2,
    ScrollText,
    Network,
    ClipboardList,
    BookMarked,
    Bug,
    TestTube2,
    TableProperties,
    PenTool,
    // Matrx AI app-specific icons
    MessageSquareText,
    Gem,
    Boxes,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

export interface FolderCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    description: string;
    color: string;
}

export const FOLDER_CATEGORIES: FolderCategory[] = [
    {
        id: 'work',
        label: 'Work',
        icon: Briefcase,
        description: 'Work-related documents and projects',
        color: 'text-blue-500 dark:text-blue-400'
    },
    {
        id: 'programming',
        label: 'Programming',
        icon: Code2,
        description: 'Code snippets and development notes',
        color: 'text-emerald-500 dark:text-emerald-400'
    },
    {
        id: 'sql-templates',
        label: 'SQL Templates',
        icon: Database,
        description: 'Reusable SQL query templates',
        color: 'text-blue-600 dark:text-blue-400'
    },
    {
        id: 'study',
        label: 'Study',
        icon: GraduationCap,
        description: 'Study materials and course notes',
        color: 'text-purple-500 dark:text-purple-400'
    },
    {
        id: 'documents',
        label: 'Documents',
        icon: FileText,
        description: 'Document files and text notes',
        color: 'text-sky-500 dark:text-sky-400'
    },
    {
        id: 'meetings',
        label: 'Meetings',
        icon: Calendar,
        description: 'Meeting notes and schedules',
        color: 'text-indigo-500 dark:text-indigo-400'
    },
    {
        id: 'personal',
        label: 'Personal',
        icon: Heart,
        description: 'Personal notes and items',
        color: 'text-rose-500 dark:text-rose-400'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        description: 'Configuration and settings',
        color: 'text-zinc-500 dark:text-zinc-400'
    },
    {
        id: 'team',
        label: 'Team',
        icon: Users,
        description: 'Team collaboration and notes',
        color: 'text-cyan-500 dark:text-cyan-400'
    },
    {
        id: 'research',
        label: 'Research',
        icon: BookOpen,
        description: 'Research materials and findings',
        color: 'text-amber-500 dark:text-amber-400'
    },
    {
        id: 'ideas',
        label: 'Ideas',
        icon: Lightbulb,
        description: 'Creative ideas and brainstorming',
        color: 'text-yellow-500 dark:text-yellow-400'
    },
    {
        id: 'projects',
        label: 'Projects',
        icon: Target,
        description: 'Project management and tasks',
        color: 'text-red-500 dark:text-red-400'
    },
    {
        id: 'finances',
        label: 'Finances',
        icon: Receipt,
        description: 'Financial documents and records',
        color: 'text-green-500 dark:text-green-400'
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: LineChart,
        description: 'Data analysis and reports',
        color: 'text-blue-500 dark:text-blue-400'
    },
    {
        id: 'emails',
        label: 'Emails',
        icon: Mail,
        description: 'Email drafts and templates',
        color: 'text-violet-500 dark:text-violet-400'
    },
    {
        id: 'images',
        label: 'Images',
        icon: Image,
        description: 'Image files and graphics',
        color: 'text-fuchsia-500 dark:text-fuchsia-400'
    },
    {
        id: 'media',
        label: 'Media',
        icon: Music,
        description: 'Media files and playlists',
        color: 'text-pink-500 dark:text-pink-400'
    },
    {
        id: 'videos',
        label: 'Videos',
        icon: Video,
        description: 'Video files and recordings',
        color: 'text-orange-500 dark:text-orange-400'
    },
    {
        id: 'security',
        label: 'Security',
        icon: Shield,
        description: 'Security-related information',
        color: 'text-teal-500 dark:text-teal-400'
    },
    {
        id: 'bookmarks',
        label: 'Bookmarks',
        icon: Link,
        description: 'Saved links and resources',
        color: 'text-lime-500 dark:text-lime-400'
    },
    {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        description: 'Archived items and backups',
        color: 'text-stone-500 dark:text-stone-400'
    },
    {
        id: 'important',
        label: 'Important',
        icon: Star,
        description: 'Important notes and items',
        color: 'text-amber-500 dark:text-amber-400'
    },
    {
        id: 'recent',
        label: 'Recent',
        icon: Clock,
        description: 'Recently accessed items',
        color: 'text-blue-500 dark:text-blue-400'
    },
    {
        id: 'cloud',
        label: 'Cloud',
        icon: Cloud,
        description: 'Cloud storage and sync',
        color: 'text-sky-500 dark:text-sky-400'
    },
    {
        id: 'completed',
        label: 'Completed',
        icon: FileCheck,
        description: 'Completed tasks and projects',
        color: 'text-green-500 dark:text-green-400'
    },
    {
        id: 'saved',
        label: 'Saved',
        icon: Bookmark,
        description: 'Saved items and favorites',
        color: 'text-purple-500 dark:text-purple-400'
    },
    {
        id: 'drafts',
        label: 'Drafts',
        icon: Pencil,
        description: 'Draft documents and notes',
        color: 'text-indigo-500 dark:text-indigo-400'
    },
    {
        id: 'trash',
        label: 'Trash',
        icon: Trash2,
        description: 'Deleted items',
        color: 'text-red-500 dark:text-red-400'
    },
    {
        id: 'downloads',
        label: 'Downloads',
        icon: Download,
        description: 'Downloaded files',
        color: 'text-emerald-500 dark:text-emerald-400'
    },
    {
        id: 'shared',
        label: 'Shared',
        icon: Share2,
        description: 'Shared files and folders',
        color: 'text-violet-500 dark:text-violet-400'
    },
    {
        id: 'general',
        label: 'General',
        icon: Folder,
        description: 'General purpose folder',
        color: 'text-blue-500 dark:text-blue-400'
    },

    // ── Technical Documentation ────────────────────────────────────────
    {
        id: 'api-docs',
        label: 'API Docs',
        icon: FileCode2,
        description: 'API documentation and endpoint references',
        color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
        id: 'specs',
        label: 'Specs',
        icon: ScrollText,
        description: 'Technical specifications, PRDs, and requirements',
        color: 'text-violet-600 dark:text-violet-400'
    },
    {
        id: 'architecture',
        label: 'Architecture',
        icon: Network,
        description: 'System architecture and design documents',
        color: 'text-slate-600 dark:text-slate-400'
    },
    {
        id: 'changelogs',
        label: 'Changelogs',
        icon: ClipboardList,
        description: 'Release notes and change logs',
        color: 'text-teal-600 dark:text-teal-400'
    },
    {
        id: 'runbooks',
        label: 'Runbooks',
        icon: BookMarked,
        description: 'Deployment guides and operations runbooks',
        color: 'text-orange-600 dark:text-orange-400'
    },
    {
        id: 'bug-reports',
        label: 'Bug Reports',
        icon: Bug,
        description: 'Bug tracking and issue documentation',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        id: 'test-cases',
        label: 'Test Cases',
        icon: TestTube2,
        description: 'Test plans, cases, and QA notes',
        color: 'text-lime-600 dark:text-lime-400'
    },
    {
        id: 'schemas',
        label: 'Schemas',
        icon: TableProperties,
        description: 'Database schemas and data model definitions',
        color: 'text-blue-700 dark:text-blue-300'
    },
    {
        id: 'wireframes',
        label: 'Wireframes',
        icon: PenTool,
        description: 'UI/UX wireframes and mockup notes',
        color: 'text-pink-600 dark:text-pink-400'
    },

    // ── Matrx AI App-Specific ──────────────────────────────────────────
    {
        id: 'chat-response',
        label: 'Chat Response',
        icon: MessageSquareText,
        description: 'Saved AI chat responses and conversations',
        color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
        id: 'prompt-idea',
        label: 'Prompt Idea',
        icon: Gem,
        description: 'Prompt engineering ideas and templates',
        color: 'text-amber-500 dark:text-amber-300'
    },
    {
        id: 'block-idea',
        label: 'Block Idea',
        icon: Boxes,
        description: 'Block and component design ideas',
        color: 'text-purple-600 dark:text-purple-400'
    },
    {
        id: 'tool-data',
        label: 'Tool Data',
        icon: Wrench,
        description: 'Tool configurations and output data',
        color: 'text-zinc-600 dark:text-zinc-300'
    },
];

/**
 * Get folder category by name (case-insensitive match)
 */
export function getFolderCategory(folderName: string): FolderCategory | undefined {
    const normalized = folderName.toLowerCase().trim();
    return FOLDER_CATEGORIES.find(cat => cat.id === normalized || cat.label.toLowerCase() === normalized);
}

/**
 * Get icon and color for a folder based on category name
 * NOTE: This is for internal use. External callers should use getFolderIconAndColor from folderUtils
 */
export function getCategoryIconAndColor(folderName: string): { icon: LucideIcon; color: string } {
    const category = getFolderCategory(folderName);
    if (category) {
        return { icon: category.icon, color: category.color };
    }
    // Default fallback
    return { icon: Folder, color: 'text-zinc-500 dark:text-zinc-400' };
}

