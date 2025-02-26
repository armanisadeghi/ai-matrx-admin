import { ActionIconProps } from "@mantine/core";
import { IconDotsVertical, IconFilePlus, IconFolderPlus } from "@tabler/icons-react";
import React, { useState } from "react";
import { indexedDBStore } from "../utils/local-indexedDB";
import { ActionIcon } from "./Buttons";

type AddFileFolderProps = {
    projectName: string;
    activeFolder?: string;
    onAdd: (path: string, isFile: boolean) => void;
    actionIconProps?: ActionIconProps;
};

export const AddFileFolder: React.FC<AddFileFolderProps> = ({ projectName, activeFolder, onAdd, actionIconProps }) => {
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async (isFile: boolean) => {
        setIsAdding(true);
        const itemType = isFile ? "file" : "folder";
        const name = prompt(`Enter ${itemType} name:`);
        if (name) {
            try {
                const project = await indexedDBStore.getRepository(projectName);
                if (project) {
                    let newPath = activeFolder ? `${activeFolder}/${name}` : name;

                    if (!isFile) {
                        newPath = newPath + "/";
                    }

                    if (isFile) {
                        project.files[newPath] = btoa(""); // Empty file content
                    } else {
                        // Just add the folder without any content, no trailing slash or content
                        project.files[newPath] = null;
                    }

                    // Sort the files alphabetically by key
                    const sortedFiles = Object.keys(project.files)
                        .sort((a, b) => a.localeCompare(b))
                        .reduce(
                            (acc, key) => {
                                acc[key] = project.files[key];
                                return acc;
                            },
                            {} as typeof project.files,
                        );

                    project.files = sortedFiles;

                    await indexedDBStore.addRepository(project);
                    onAdd(newPath, isFile);
                }
            } catch (error) {
                console.error(`Error adding ${itemType}:`, error);
                alert(`Failed to add ${itemType}. Please try again.`);
            }
        }
        setIsAdding(false);
    };

    return (
        <>
            <ActionIcon onClick={() => handleAdd(true)} loading={isAdding} tooltip="new file">
                <IconFilePlus size={18} />
            </ActionIcon>
            <ActionIcon onClick={() => handleAdd(false)} loading={isAdding} tooltip="new folder">
                <IconFolderPlus size={18} />
            </ActionIcon>
            <ActionIcon>
                <IconDotsVertical size={18} />
            </ActionIcon>
        </>
    );
};
