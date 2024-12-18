// components/DirectoryTree/EnhancedDirectoryTree.tsx
import React, {useState, useMemo} from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Search} from 'lucide-react';
import {
    EnhancedDirectoryTreeConfig,
    ENHANCED_DEFAULT_CONFIG,
} from './config';
import {TreeRenderer} from './TreeRenderer';
import {RenameModal} from './RenameModal';

interface EnhancedDirectoryTreeProps {
    structure: Record<string, any>;
    onSelect: (path: string) => void;
    config?: Partial<EnhancedDirectoryTreeConfig>;
    title?: string;
    className?: string;
    onPreview?: (path: string) => void;
    onDownload?: (path: string) => void;
    onCopy?: (path: string) => void;
    onDelete?: (path: string) => void;
    onRename?: (path: string, newName: string) => void;
}

export const EnhancedDirectoryTree: React.FC<EnhancedDirectoryTreeProps> = (
    {
        structure,
        onSelect,
        config = {},
        title = "File Explorer",
        className = "",
        onPreview,
        onCopy,
        onDownload,
        onDelete,
        onRename,
    }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [renamingPath, setRenamingPath] = useState<string | null>(null);

    const finalConfig = useMemo(() => ({
        ...ENHANCED_DEFAULT_CONFIG,
        ...config,
        categorization: {...ENHANCED_DEFAULT_CONFIG.categorization, ...config.categorization},
        preview: {...ENHANCED_DEFAULT_CONFIG.preview, ...config.preview},
        sorting: {...ENHANCED_DEFAULT_CONFIG.sorting, ...config.sorting},
        filter: {...ENHANCED_DEFAULT_CONFIG.filter, ...config.filter},
        display: {...ENHANCED_DEFAULT_CONFIG.display, ...config.display},
    }), [config]);

    const toggleDir = (path: string) => {
        setExpanded(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    const matchesSearch = (path: string): boolean => {
        if (!searchTerm) return true;
        return path.toLowerCase().includes(searchTerm.toLowerCase());
    };

    const handleStartRename = (path: string) => {
        setRenamingPath(path);
    };

    const handleRename = (newName: string) => {
        if (renamingPath && onRename) {
            const pathParts = renamingPath.split('/');
            const parentPath = pathParts.slice(0, -1).join('/');
            const newPath = parentPath ? `${parentPath}/${newName}` : newName;
            onRename(renamingPath, newPath);
        }
        setRenamingPath(null);
    };

    const getCurrentName = () => {
        if (!renamingPath) return '';
        return renamingPath.split('/').pop() || '';
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
                    <TreeRenderer
                        node={structure}
                        expanded={expanded}
                        finalConfig={finalConfig}
                        onSelect={onSelect}
                        toggleDir={toggleDir}
                        matchesSearch={matchesSearch}
                        onStartRename={handleStartRename}
                        onPreview={onPreview}
                        onCopy={onCopy}
                        onDownload={onDownload}
                        onDelete={onDelete}
                    />
                </div>
            </CardContent>

            <RenameModal
                isOpen={!!renamingPath}
                onClose={() => setRenamingPath(null)}
                currentName={getCurrentName()}
                onRename={handleRename}
            />
        </Card>
    );
};