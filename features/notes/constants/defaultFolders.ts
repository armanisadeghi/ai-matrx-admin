import { FileText, Briefcase, User, Lightbulb, Edit3 } from 'lucide-react';

export interface DefaultFolder {
    name: string;
    icon: typeof FileText;
    color?: string;
}

export const DEFAULT_FOLDERS: DefaultFolder[] = [
    {
        name: 'Draft',
        icon: Edit3,
        color: 'text-blue-500',
    },
    {
        name: 'Personal',
        icon: User,
        color: 'text-green-500',
    },
    {
        name: 'Business',
        icon: Briefcase,
        color: 'text-purple-500',
    },
    {
        name: 'Prompts',
        icon: Lightbulb,
        color: 'text-yellow-500',
    },
    {
        name: 'Scratch',
        icon: FileText,
        color: 'text-gray-500',
    },
];

export const DEFAULT_FOLDER_NAMES = DEFAULT_FOLDERS.map(f => f.name);

export function getDefaultFolder(folderName: string): DefaultFolder | undefined {
    return DEFAULT_FOLDERS.find(f => f.name === folderName);
}

