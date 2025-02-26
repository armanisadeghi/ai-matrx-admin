import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CreateProject } from "./CreateProject";
import { GitHubImport } from "./GitHubImport";
import { IconX } from "@tabler/icons-react";

export type NewTabOptions = "new-project-blank" | "new-project-github";

interface NewProjectDrawerProps {
    opened: boolean;
    onClose: () => void;
    onProjectCreated: () => void;
    selectedTab?: NewTabOptions;
    title?: string;
    position?: "right" | "left";
    size?: "sm" | "md" | "lg" | "xl";
}

export const NewProjectDrawer: React.FC<NewProjectDrawerProps> = ({
                                                                      opened,
                                                                      onClose,
                                                                      onProjectCreated,
                                                                      selectedTab = "new-project-blank",
                                                                      title = "Create a project",
                                                                      position = "right",
                                                                      size = "xl",
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

    // Control body scroll when drawer is open
    useEffect(() => {
        if (opened) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [opened]);

    // Determine drawer width based on size prop
    const getDrawerWidth = () => {
        switch (size) {
            case "sm": return "max-w-sm";
            case "md": return "max-w-md";
            case "lg": return "max-w-lg";
            case "xl": return "max-w-xl";
            default: return "max-w-xl";
        }
    };

    if (!opened) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 ${position === "right" ? "right-0" : "left-0"} h-full w-full ${getDrawerWidth()} bg-neutral-800 text-white shadow-lg z-50 overflow-y-auto transition-transform duration-300 ease-in-out`}
            >
                {/* Drawer header */}
                <div className="flex justify-between items-center p-4 border-b border-neutral-700">
                    <h2 className="text-lg font-medium">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {/* Drawer content */}
                <div className="p-4">
                    <div className="w-full mx-auto min-h-48">
                        <nav className="flex gap-1 border-b-2 border-neutral-600 mb-2.5 pb-1.5">
                            {tabData.map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.title}
                                </TabButton>
                            ))}
                        </nav>
                        {activeTabContent}
                    </div>
                </div>
            </div>
        </>
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