// components/DirectoryTree/DirectoryTree.tsx
import React, {useState, useMemo} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {
    Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {ChevronDown, ChevronRight, Folder, Search} from 'lucide-react';
import {FILE_ICONS, DirectoryTreeConfig, DEFAULT_CONFIG} from './config';

interface DirectoryTreeProps {
    structure: Record<string, any>;
    onSelect: (path: string) => void;
    config?: Partial<DirectoryTreeConfig>;
    title?: string;
    className?: string;
}

export const DirectoryTree: React.FC<DirectoryTreeProps> = (
    {
        structure,
        onSelect,
        config = {},
        title = "File Explorer",
        className = ""
    }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const finalConfig = {...DEFAULT_CONFIG, ...config};

    const toggleDir = (path: string) => {
        setExpanded(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    const getFileIcon = (filename: string) => {
        if (!finalConfig.showIcons) return null;

        const extension = filename.includes('.')
                          ? filename.substring(filename.lastIndexOf('.'))
                          : '';

        const IconComponent = FILE_ICONS[extension] || FILE_ICONS.default;
        return <IconComponent className="w-4 h-4 mr-2 text-muted-foreground"/>;
    };

    const shouldShowFile = (filename: string): boolean => {
        if (searchTerm && !filename.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        const isHidden = filename.startsWith('.');
        if (finalConfig.hideHiddenFiles && isHidden) return false;

        if (finalConfig.excludeFiles?.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(filename);
            }
            return filename === pattern;
        })) return false;

        return true;
    };

    const shouldShowDirectory = (dirname: string): boolean => {
        if (searchTerm && !dirname.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        return !finalConfig.excludeDirs?.includes(dirname);
    };

    const sortEntries = (entries: [string, any][]): [string, any][] => {
        return entries.sort(([keyA, valueA], [keyB, valueB]) => {
            const isADirectory = valueA !== null && typeof valueA === 'object';
            const isBDirectory = valueB !== null && typeof valueB === 'object';

            // Handle folders first sorting
            if (finalConfig.sortFoldersFirst && isADirectory !== isBDirectory) {
                return isADirectory ? -1 : 1;
            }

            // Put hidden files last
            const aHidden = keyA.startsWith('.');
            const bHidden = keyB.startsWith('.');
            if (aHidden !== bHidden) {
                return aHidden ? 1 : -1;
            }

            // Regular alphabetical sorting
            return keyA.localeCompare(keyB);
        });
    };

    const renderTree = (node: Record<string, any>, path = '', level = 0) => {
        if (!node || typeof node !== 'object') return null;

        const entries = sortEntries(Object.entries(node));

        return entries.map(([key, value]) => {
            const currentPath = path ? `${path}/${key}` : key;
            const isDirectory = value !== null && typeof value === 'object';

            if (isDirectory && !shouldShowDirectory(key)) return null;
            if (!isDirectory && !shouldShowFile(key)) return null;

            const indentStyle = {
                marginLeft: `${level * finalConfig.indentSize}px`
            };

            return (
                <motion.div
                    key={currentPath}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                >
                    <div
                        className="flex items-center p-1 hover:bg-accent rounded cursor-pointer"
                        style={indentStyle}
                        onClick={() => isDirectory ? toggleDir(currentPath) : onSelect(currentPath)}
                    >
                        {isDirectory ? (
                            <>
                                {expanded[currentPath]
                                 ? <ChevronDown className="w-4 h-4 flex-shrink-0"/>
                                 : <ChevronRight className="w-4 h-4 flex-shrink-0"/>
                                }
                                <Folder className="w-4 h-4 ml-1 mr-2 text-primary flex-shrink-0"/>
                            </>
                        ) : (
                             <div className="ml-6 flex items-center">
                                 {getFileIcon(key)}
                             </div>
                         )}
                        <span className="text-foreground truncate">{key}</span>
                    </div>
                    <AnimatePresence>
                        {isDirectory && expanded[currentPath] &&
                            renderTree(value, currentPath, level + 1)}
                    </AnimatePresence>
                </motion.div>
            );
        });
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    {title}
                </CardTitle>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-auto max-h-[500px]">
                    {renderTree(structure)}
                </div>
            </CardContent>
        </Card>
    );
};


/*
// Example usage
const config: DirectoryTreeConfig = {
    excludeFiles: [
        '*.log',          // Exclude all log files
        'package-lock.json',
        'yarn.lock'
    ],
    excludeDirs: [
        'node_modules',
        '.git'
    ],
    hideHiddenFiles: true,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true
};

<DirectoryTree
    structure={directoryStructure}
    onSelect={handleFileSelect}
    config={config}
    title="Project Files"
/>*/
