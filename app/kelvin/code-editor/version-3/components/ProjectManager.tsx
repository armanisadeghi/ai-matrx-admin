import React, {useEffect, useState} from "react";

import {AddFileFolder} from "./AddFileFolder";
import {buildTree, FileTree} from "./FolderStructure";
import {indexedDBStore} from "@/app/kelvin/code-editor/version-3/utils";
import {IRepoData} from "@/app/kelvin/code-editor/version-3/types";

export const ProjectManager: React.FC<{ projectName: string }> = ({ projectName }) => {
    const [project, setProject] = useState<IRepoData | null>(null);

    useEffect(() => {
        loadProject();
    }, [projectName]);

    const loadProject = async () => {
        try {
            const loadedProject = await indexedDBStore.getRepository(projectName);
            setProject(loadedProject || null);
        } catch (error) {
            console.error("Error loading project:", error);
        }
    };

    const handleFileSelect = (path: string, content: string) => {
        // Handle file selection here
        console.log(`Selected file: ${path}`);
        console.log(`Content: ${content}`);
    };

    if (!project) {
        return <div className="flex items-center justify-center p-4">Loading...</div>;
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm p-4">
            <h2 className="text-xl font-bold mb-4">{project.name}</h2>
            <AddFileFolder projectName={project.name} onAdd={loadProject} />
            <FileTree treeData={buildTree(project)} onFileSelect={handleFileSelect} repoName={project?.name} />
        </div>
    );
};