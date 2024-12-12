// components/notes-app/folders/FolderTree.tsx
import React, {useState, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {ChevronDown, ChevronRight, FileText} from 'lucide-react';
import {Note, Folder} from '@/types/notes.types';
import {cn} from '@/lib/utils';
import {folderTypes, renderFolderIcon} from "./folder-categories";

interface FolderTreeProps {
    notes: Note[];
    folders: Folder[];
    selectedNoteId: string | null;
    selectedFolderId: string | null;
    onSelectNote: (noteId: string) => void;
    onSelectFolder: (folderId: string) => void;
    onAddFolder: () => void;
    className?: string;
    searchTerm?: string;
}

export const FolderTree: React.FC<FolderTreeProps> = (
    {
        notes,
        folders,
        selectedNoteId,
        selectedFolderId,
        onSelectNote,
        onSelectFolder,
        className,
        searchTerm = ''
    }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Create folder hierarchy
    const folderHierarchy = useMemo(() => {
        const hierarchy: Record<string | null, Folder[]> = {null: []};
        folders.forEach(folder => {
            if (!hierarchy[folder.parentId]) {
                hierarchy[folder.parentId] = [];
            }
            hierarchy[folder.parentId].push(folder);
        });
        return hierarchy;
    }, [folders]);

    // Get notes for a specific folder
    const getNotesByFolder = (folderId: string | null) => {
        return notes.filter(note => note.folderId === folderId);
    };

    const toggleFolder = (folderId: string) => {
        setExpanded(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const renderTree = (parentId: string | null = null, level = 0) => {
        const currentFolders = folderHierarchy[parentId] || [];
        const currentNotes = getNotesByFolder(parentId);

        return (
            <>
                {currentFolders.map(folder => (
                    <motion.div
                        key={folder.id}
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        style={{paddingLeft: `${level * 8}px`}}
                    >
                        <div
                            className={cn(
                                "flex items-center h-6 hover:bg-accent/50 cursor-pointer text-xs group",
                                selectedFolderId === folder.id && "bg-accent"
                            )}
                            onClick={() => {
                                toggleFolder(folder.id);
                                onSelectFolder(folder.id);
                            }}
                        >
                            <ChevronDown
                                className={cn(
                                    "w-3.5 h-3.5 flex-shrink-0 transition-transform text-amber-500 dark:text-amber-400 mx-0.5",
                                    !expanded[folder.id] && "-rotate-90"
                                )}
                            />
                            {renderFolderIcon(folder.type)}
                            <span className="truncate ml-1">{folder.name}</span>
                        </div>
                        <AnimatePresence>
                            {expanded[folder.id] && renderTree(folder.id, level + 1)}
                        </AnimatePresence>
                    </motion.div>
                ))}
                {currentNotes.map(note => (
                    <motion.div
                        key={note.id}
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        style={{paddingLeft: `${(level + 1) * 8}px`}}
                    >
                        <div
                            className={cn(
                                "flex items-center h-6 hover:bg-accent/50 cursor-pointer text-xs",
                                selectedNoteId === note.id && "bg-accent"
                            )}
                            onClick={() => onSelectNote(note.id)}
                        >
                            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400 mx-0.5"/>
                            <span className="truncate ml-1">{note.title}</span>
                        </div>
                    </motion.div>
                ))}
            </>
        );
    };

    return (
        <div className={cn("h-full select-none", className)}>
            {renderTree()}
        </div>
    );
};

export default FolderTree;
