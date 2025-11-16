// components/DirectoryTree/TreeRenderer.tsx
import React from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {shouldShowItem, sortItems, getFileCategory} from './config';
import type {EnhancedDirectoryTreeConfig} from './config';
import {renderContextMenu, renderItemContent} from './DirectoryItemRenderers';

interface TreeRendererProps {
    node: Record<string, any>;
    path?: string;
    level?: number;
    expanded: Record<string, boolean>;
    finalConfig: EnhancedDirectoryTreeConfig;
    onSelect: (path: string) => void;
    toggleDir: (path: string) => void;
    matchesSearch: (path: string) => boolean;
    onStartRename?: (path: string) => void;
    onPreview?: (path: string) => void;
    onCopy?: (path: string) => void;
    onDownload?: (path: string) => void;
    onDelete?: (path: string) => void;
}

const renderCategoryGroup = (
    items: [string, any][],
    category: string,
    renderItem: (key: string, value: any) => React.ReactNode,
    finalConfig: EnhancedDirectoryTreeConfig
) => {
    if (!items.length) return null;

    return (
        <div key={category} className="mb-4">
            {finalConfig.categorization.showCategoryHeaders && (
                <div className="text-sm font-medium text-muted-foreground mb-2 pl-2">
                    {category}
                </div>
            )}
            {items.map(([key, value]) => renderItem(key, value))}
        </div>
    );
};

export const TreeRenderer: React.FC<TreeRendererProps> = (
    {
        node,
        path = '',
        level = 0,
        expanded,
        finalConfig,
        onSelect,
        toggleDir,
        matchesSearch,
        onStartRename,
        onPreview,
        onCopy,
        onDownload,
        onDelete,
    }) => {
    const handleItemClick = (e: React.MouseEvent, itemPath: string, isDirectory: boolean) => {
        // Prevent click if it's coming from the context menu
        if ((e.target as HTMLElement).closest('[role="menuitem"]')) {
            return;
        }

        if (isDirectory) {
            toggleDir(itemPath);
        } else {
            onSelect(itemPath);
        }
    };

    const renderItem = (name: string, item: any, currentPath = '', currentLevel = 0) => {
        const itemPath = currentPath ? `${currentPath}/${name}` : name;
        const isDirectory = item !== null && typeof item === 'object';

        if (!shouldShowItem(name, isDirectory, finalConfig)) return null;
        if (!matchesSearch(itemPath)) return null;

        const indentStyle = {marginLeft: `${currentLevel * finalConfig.display.indentSize}px`};

        const itemContent = renderItemContent(itemPath, isDirectory, item, expanded, finalConfig);

        return (
            <motion.div
                key={itemPath}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
            >
                <div
                    className={`
                        p-1 hover:bg-accent rounded cursor-pointer
                        ${finalConfig.display.compactMode ? 'py-0.5' : 'py-2'}
                    `}
                    style={indentStyle}
                    onClick={(e) => handleItemClick(e, itemPath, isDirectory)}
                >
                    {renderContextMenu({
                        path: itemPath,
                        isDirectory,
                        item,
                        finalConfig,
                        onPreview,
                        onDownload,
                        onCopy,
                        onDelete,
                        onStartRename,
                        children: itemContent
                    })}
                </div>

                <AnimatePresence>
                    {isDirectory && expanded[itemPath] && (
                        <motion.div
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            exit={{opacity: 0, height: 0}}
                        >
                            <TreeRenderer
                                node={item}
                                path={itemPath}
                                level={currentLevel + 1}
                                expanded={expanded}
                                finalConfig={finalConfig}
                                onSelect={onSelect}
                                toggleDir={toggleDir}
                                matchesSearch={matchesSearch}
                                onStartRename={onStartRename}
                                onPreview={onPreview}
                                onCopy={onCopy}
                                onDownload={onDownload}
                                onDelete={onDelete}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    if (!node || typeof node !== 'object') return null;

    const entries = sortItems(Object.entries(node), finalConfig);

    if (finalConfig.categorization.enabled && finalConfig.categorization.groupByCategory) {
        const categorizedItems = new Map<string, [string, any][]>();

        entries.forEach(entry => {
            const category = getFileCategory(entry[0]);
            if (!categorizedItems.has(category)) {
                categorizedItems.set(category, []);
            }
            categorizedItems.get(category)!.push(entry);
        });

        return (
            <>
                {Array.from(categorizedItems.entries()).map(([category, items]) =>
                    renderCategoryGroup(
                        items,
                        category,
                        (key, value) => renderItem(key, value, path, level),
                        finalConfig
                    )
                )}
            </>
        );
    }

    return <>{entries.map(([key, value]) => renderItem(key, value, path, level))}</>;
};