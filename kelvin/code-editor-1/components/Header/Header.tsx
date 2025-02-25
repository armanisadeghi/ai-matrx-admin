"use client";

import { ActionIcon, Button, RunCode } from "@/app/dashboard/code-editor/components/Buttons";
import {
    IconBolt,
    IconHome,
    IconLayoutSidebar,
    IconLayoutSidebarRight,
    IconPackages,
    IconQuestionMark,
    IconTrash,
} from "@tabler/icons-react";
import { IRepoData } from "@/app/dashboard/code-editor/types";
import { useState } from "react";

const iconSize = 18;

type HeaderProps = {
    selectedRepo: IRepoData;
    isPublishing?: boolean;
    onDeleteFromGitHub: () => void;
    onCodeAnalyze: () => void;
    onRepoClose: () => void;
    onPushToGitHub: () => void;
    detailsOpen: () => void;
    toggleSidebar: () => void; // Add this line
    selectedFile: { path: string; content: string } | null;
    onRunCode: () => Promise<void>;
    isExecuting?: boolean;
};

export const Header: React.FC<HeaderProps> = ({
    selectedRepo,
    onRepoClose,
    onDeleteFromGitHub,
    onCodeAnalyze,
    isPublishing,
    detailsOpen,
    toggleSidebar,
    selectedFile,
    onRunCode,
    isExecuting,
}) => {
    const [sidebarState, setSidebarState] = useState(true);

    const handleSidebarToggle = () => {
        setSidebarState(!sidebarState);
        toggleSidebar();
    };

    return (
        <div className="flex items-center justify-between px-3 py-2 rounded">
            <div className="flex items-center">
                <ActionIcon onClick={handleSidebarToggle}>
                    {sidebarState ? <IconLayoutSidebar size={iconSize} /> : <IconLayoutSidebarRight size={iconSize} />}
                </ActionIcon>
                <ActionIcon onClick={onRepoClose}>
                    <IconHome size={iconSize} />
                </ActionIcon>
            </div>
            <div className="flex items-center gap-2">
                <p className="mb-0 px-2 py-0.5 text-sm flex bg-neutral-800 rounded-lg">Drafts</p>
                <Button
                    variant="subtle"
                    onClick={detailsOpen}
                    leftSection={<IconPackages size={iconSize} />}
                    className="px-2 py-0.5 text-sm"
                >
                    {selectedRepo.name}
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <ActionIcon>
                    <IconQuestionMark size={iconSize} />
                </ActionIcon>
                {selectedRepo.githubUrl && (
                    <Button
                        leftSection={<IconTrash size={iconSize} />}
                        onClick={onDeleteFromGitHub}
                        loading={isPublishing}
                        variant="danger"
                    >
                        Delete
                    </Button>
                )}
                <Button leftSection={<IconBolt size={iconSize} />} onClick={onCodeAnalyze} loading={isPublishing}>
                    Analyze
                </Button>
                {selectedFile && <RunCode onRunCode={onRunCode} loading={isExecuting} />}
            </div>
        </div>
    );
};
