import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer, DrawerProps } from "@mantine/core";
import { CreateProject } from "./CreateProject";
import { GitHubImport } from "./GitHubImport";

export type NewTabOptions = "new-project-blank" | "new-project-github";

interface NewProjectDrawerProps extends Omit<DrawerProps, "children"> {
    onProjectCreated: () => void;
    selectedTab?: NewTabOptions;
}

export const NewProjectDrawer: React.FC<NewProjectDrawerProps> = ({
    opened,
    onClose,
    onProjectCreated,
    selectedTab = "new-project-blank",
    ...drawerProps
}) => {
    const [activeTab, setActiveTab] = useState(selectedTab);

    const handleCloseDrawer = useCallback(() => {
        onProjectCreated();
        onClose();
    }, [onProjectCreated, onClose]);

    const tabData = useMemo(
        () => [
            {
                id: "new-project-blank" as const,
                title: "Blank project",
                content: <CreateProject onProjectCreated={handleCloseDrawer} />,
            },
            {
                id: "new-project-github" as const,
                title: "Import from GitHub",
                content: <GitHubImport onRepoCloned={handleCloseDrawer} />,
            },
        ],
        [handleCloseDrawer],
    );

    const activeTabContent = useMemo(() => tabData.find((tab) => tab.id === activeTab)?.content, [tabData, activeTab]);

    useEffect(() => {
        setActiveTab(selectedTab);
    }, [selectedTab]);

    return (
        <Drawer opened={opened} onClose={onClose} title="Create a project" position="right" size="xl" {...drawerProps}>
            <div className="w-full mx-auto min-h-48">
                <nav className="flex gap-1 border-b-2 border-neutral-600 mb-2.5 pb-1.5">
                    {tabData.map((tab) => (
                        <TabButton
                            key={tab.id}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)} // Close drawer and let parent handle tab change
                        >
                            {tab.title}
                        </TabButton>
                    ))}
                </nav>
                {activeTabContent}
            </div>
        </Drawer>
    );
};

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
    <button
        className={`px-3 py-1.5 font-normal text-sm text-white transition-colors delay-150 rounded ${
            isActive ? "bg-neutral-700" : "hover:bg-neutral-700"
        }`}
        onClick={onClick}
    >
        {children}
    </button>
);
