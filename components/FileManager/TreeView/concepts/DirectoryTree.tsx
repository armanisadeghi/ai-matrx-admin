'use client';

import React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {ChevronRight, Search} from 'lucide-react';
import {getFileDetails, getFolderDetails, NodeStructure} from "@/utils/file-operations";
import {cn} from '@/lib/utils';
import {BucketSelector} from './BucketSelector';
import {useDirectoryTree} from './useDirectoryTree';
import {DEFAULT_CONFIG, DirectoryTreeConfig} from '@/components/DirectoryTree/config';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileContextMenu } from '@/components/FileManager/ContextMenus/FileContextMenu';
import { FolderContextMenu } from '@/components/FileManager/ContextMenus/FolderContextMenu';


interface DirectoryTreeProps {
    config?: Partial<DirectoryTreeConfig>;
    title?: string;
    className?: string;
}

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
    config = {},
    title = "File Explorer",
    className = ""
}) => {
    const finalConfig = {...DEFAULT_CONFIG, ...config};

    const {
        expandedPaths,
        searchTerm,
        setSearchTerm,
        currentStructure,
        activeNode,
        toggleFolder,
        navigateToNode,
        shouldShowNode,
        sortNodes
    } = useDirectoryTree(finalConfig);

    const renderNode = (node: NodeStructure, level: number) => {
        if (!shouldShowNode(node)) return null;

        const isExpanded = expandedPaths.has(node.path);
        const isActive = activeNode?.path === node.path;
        const details = node.type === 'FOLDER' ?
            getFolderDetails(node.name) :
            getFileDetails(node.extension);
        const IconComponent = details.icon;

        const handleNodeClick = () => {
            if (node.type === 'FOLDER') {
                toggleFolder(node);
                navigateToNode(node); // Set folder as active node but don't change tree state
            } else {
                navigateToNode(node);
            }
        };

        const handleContextMenu = () => {
            navigateToNode(node); // Set as active node when opening context menu
        };

        return (
            <div key={node.path}>
                <ContextMenu>
                    <ContextMenuTrigger>
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                        >
                            <div
                                className={cn(
                                    'flex items-center p-1 hover:bg-accent rounded cursor-pointer',
                                    isActive && 'bg-accent/50'
                                )}
                                style={{marginLeft: `${level * finalConfig.indentSize}px`}}
                                onClick={handleNodeClick}
                                onContextMenu={handleContextMenu}
                            >
                                {node.type === 'FOLDER' && (
                                    <ChevronRight
                                        className={cn(
                                            'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                                            isExpanded && 'rotate-90'
                                        )}
                                    />
                                )}
                                <IconComponent
                                    className={cn(
                                        'w-4 h-4 ml-1 mr-2 flex-shrink-0',
                                        details.color
                                    )}
                                />
                                <span className="text-foreground truncate">
                                    {node.name}
                                </span>
                            </div>
                        </motion.div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="z-[100]">
                        {node.type === 'FOLDER' ? (
                            <FolderContextMenu
                                menuData={{bucketName: node.bucketName, path: node.path}}
                                onClose={() => {
                                }}
                            />
                        ) : (
                            <FileContextMenu
                                menuData={{bucketName: node.bucketName, path: node.path}}
                                onClose={() => {
                                }}
                            />
                        )}
                    </ContextMenuContent>
                </ContextMenu>
                <AnimatePresence>
                    {isExpanded && node.children && (
                        <motion.div
                            initial={{height: 0, opacity: 0}}
                            animate={{height: 'auto', opacity: 1}}
                            exit={{height: 0, opacity: 0}}
                            transition={{duration: 0.2}}
                        >
                            {sortNodes(node.children).map(child =>
                                renderNode(child, level + 1)
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <Card className={cn('flex flex-col h-full', className)}>
            <CardHeader className="flex-shrink-0">
                <CardTitle className="flex justify-between items-center p-4">
                    {title}
                </CardTitle>
                <BucketSelector/>
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
            <CardContent className="flex-1 overflow-auto">
                {currentStructure?.contents &&
                    sortNodes(currentStructure.contents).map(node =>
                        renderNode(node, 0)
                    )}
            </CardContent>
        </Card>
    );
};