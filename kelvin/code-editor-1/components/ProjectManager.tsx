import React, { useEffect, useState } from "react";
import { Paper, Title } from "@mantine/core";

import { AddFileFolder } from "./AddFileFolder";
import { buildTree, FileTree } from "./FolderStructure";
import { IRepoData } from "@/app/dashboard/code-editor/types";
import { supabaseIndexedDBStore } from "@/app/dashboard/code-editor/utils";

export const ProjectManager: React.FC<{ projectName: string }> = ({ projectName }) => {
    const [project, setProject] = useState<IRepoData | null>(null);

    useEffect(() => {
        loadProject();
    }, [projectName]);

    const loadProject = async () => {
        try {
            const loadedProject = await supabaseIndexedDBStore.getRepository(projectName);
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
        return <div>Loading...</div>;
    }

    return (
        <Paper p="md">
            <Title order={2}>{project.name}</Title>
            <AddFileFolder projectName={project.name} onAdd={loadProject} />
            <FileTree treeData={buildTree(project)} onFileSelect={handleFileSelect} repoName={project?.name} />
        </Paper>
    );
};
