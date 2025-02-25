"use client";

import { IconDotsVertical, IconFolderFilled, IconFolderOpen, IconPencil, IconTrash } from "@tabler/icons-react";
import { Menu } from "@mantine/core";

import { useEffect, useRef, useState } from "react";
import { getIconFromExtension, indexedDBStore } from "../../utils";
import { IFile } from "../../workspace/[repoName]/page";
import { IFileNode } from "./utils";
import { TextInput } from "@/app/dashboard/code-editor/components";

type TreeNodeProps = React.HTMLAttributes<HTMLDivElement> & {
    node: IFileNode;
    path: string;
    repoName: string;
    onFileSelect?: (path: string, content: string) => void;
    onFolderSelect: (path: string) => void;
    onUpdate: () => void;
    activeFolder: string;
    selectedFile: IFile;
};

export const TreeNode: React.FC<TreeNodeProps> = ({
    node,
    path,
    repoName,
    onFileSelect,
    onFolderSelect,
    onUpdate,
    activeFolder,
    selectedFile,
    ...others
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isActive = fullPath === activeFolder;
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFolderClick = () => {
        setIsExpanded(!isExpanded);
        onFolderSelect(fullPath === activeFolder ? "" : fullPath);
    };

    const decodeBase64 = (content: string) => atob(content);

    const FileIcon = node.isFolder ? (isExpanded ? IconFolderOpen : IconFolderFilled) : getIconFromExtension(node.name);

    const handleRename = async () => {
        if (newName !== node.name) {
            console.log({ isRenaming, newName, name: node.name });

            const oldPath = fullPath;
            const newPath = path ? `${path}/${newName}` : newName;

            try {
                setIsLoading(true);
                if (node.isFolder) {
                    await indexedDBStore.updateFolder(repoName, oldPath, newPath);
                } else {
                    const content = node.content ? decodeBase64(node.content) : "";
                    await indexedDBStore.updateFile(repoName, oldPath, newPath, content);
                }
                console.log("renamed");
                onUpdate();
            } catch (error) {
                console.error("Error renaming:", error);
                // Handle error (e.g., show error message to user)
            } finally {
                setIsLoading(false);
            }
        }
        setIsRenaming(false);
    };

    const handleDelete = async () => {
        try {
            if (!confirm(`Are you sure you want to delete this "${node.name}"?`)) {
                return;
            }

            if (node.isFolder) {
                await indexedDBStore.deleteFolder(repoName, fullPath);
            } else {
                await indexedDBStore.deleteFile(repoName, fullPath);
            }
            onUpdate();
        } catch (error) {
            console.error("Error deleting:", error);
            // Handle error (e.g., show error message to user)
        }
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            await handleRename();
        } else if (event.key === "Escape") {
            setNewName(node.name);
            setIsRenaming(false);
        }
    };

    const handleBlur = async () => {
        await handleRename();
    };

    const activeFolderClass = node.isFolder
        ? isActive
            ? "font-normal"
            : isExpanded
              ? "font-normal"
              : "font-normal"
        : "subtle";

    const activeFileClass = !node.isFolder && selectedFile?.path === fullPath ? "bg-neutral-700" : "bg-neutral-0";

    useEffect(() => {
        setIsExpanded(node.isFolder && node.name === fullPath && selectedFile?.path.split("/").includes(fullPath));
    }, [selectedFile]);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isRenaming]);

    return (
        <div {...others}>
            <div
                className={`flex items-center gap-2 rounded transition ease-in-out delay-150 border border-transparent hover:bg-neutral-800 ${activeFolderClass} ${activeFileClass}`}
            >
                {isLoading && <>loading</>}
                {isRenaming ? (
                    <TextInput
                        ref={inputRef}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full"
                        size="sm"
                    />
                ) : (
                    <>
                        <button
                            className={`flex-grow p-1 flex items-center gap-2 text-sm text-white `}
                            onClick={
                                node.isFolder
                                    ? handleFolderClick
                                    : () => onFileSelect!(fullPath, decodeBase64(node?.content ?? ""))
                            }
                        >
                            <FileIcon size={16} className={node.isFolder ? "text-yellow-400" : ""} />
                            <span>{node.name}</span>
                        </button>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <button className="rounded p-2 hover:bg-neutral-700">
                                    <IconDotsVertical size={16} />
                                </button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => setIsRenaming(true)}>
                                    Rename
                                </Menu.Item>
                                <Menu.Item leftSection={<IconTrash size={16} />} onClick={handleDelete}>
                                    Delete
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </>
                )}
            </div>
            {node.isFolder &&
                isExpanded &&
                node.children?.map((child) => (
                    <TreeNode
                        key={child.name}
                        node={child}
                        path={fullPath}
                        repoName={repoName}
                        onFileSelect={onFileSelect}
                        onFolderSelect={onFolderSelect}
                        onUpdate={onUpdate}
                        activeFolder={activeFolder}
                        style={{ marginLeft: 12 }}
                        selectedFile={selectedFile}
                    />
                ))}
        </div>
    );
};
