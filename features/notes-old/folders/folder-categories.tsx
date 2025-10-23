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
    LucideIcon,
} from 'lucide-react';
import {cn} from '@/lib/utils';

interface FolderType {
    id: string;
    label: string;
    icon: LucideIcon;
    description: string;
    color: string;
}

export const folderTypes: FolderType[] = [
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
];


export const renderFolderIcon = (folderType: string) => {
    const folderConfig = folderTypes.find(f => f.id === folderType) || folderTypes[folderTypes.length - 1];
    const IconComponent = folderConfig.icon;
    return <IconComponent className={cn("w-3.5 h-3.5 flex-shrink-0", folderConfig.color)}/>;
};
