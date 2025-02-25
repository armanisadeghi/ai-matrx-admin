import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalProps } from "@mantine/core";
import { Button, Textarea, TextInput } from "@/app/dashboard/code-editor/components";
import { IconCloudUpload, IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { IRepoData } from "@/app/dashboard/code-editor/types";

type DetailsModalProps = ModalProps & {
    selectedRepo: IRepoData;
    isPublishing: boolean;
    isUpdating: boolean;
    onRepoUpdate: (oldName: string, newName: string, description: string) => Promise<void>;
    onPushToGitHub: (privacy?: boolean) => void;
};

export const DetailsModal: React.FC<DetailsModalProps> = ({
    opened,
    onClose,
    selectedRepo,
    isPublishing,
    isUpdating,
    onPushToGitHub,
    onRepoUpdate,
}) => {
    const [newName, setNewName] = useState<string>();
    const [newDesc, setNewDesc] = useState<string>();
    const [activeTab, setActiveTab] = useState("details-modal-update");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkAuthLoading, setCheckAuthLoading] = useState<boolean>(false);

    const checkGitHubAuth = async () => {
        try {
            setCheckAuthLoading(true);
            const response = await fetch("/api/auth/github-status");
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated);
        } catch (error) {
            console.error("Error checking GitHub auth status:", error);
        } finally {
            setCheckAuthLoading(false);
        }
    };

    const handleUpdate = async () => {
        await onRepoUpdate(selectedRepo.name, newName, newDesc);
        onClose();
    };

    const handlePublish = async () => {
        await onPushToGitHub();
        onClose();
    };

    const tabData = useMemo(
        () => [
            {
                id: "details-modal-update" as const,
                title: "Update project",
                content: (
                    <div className="flex flex-col gap-4">
                        <TextInput
                            label="Name"
                            placeholder="Default name:"
                            className="w-full"
                            value={newName}
                            onChange={(evt) => setNewName(evt.currentTarget.value)}
                        />
                        <Textarea
                            label="Description"
                            placeholder="What does this project do?"
                            className="w-full"
                            value={newDesc}
                            onChange={(evt) => setNewDesc(evt.currentTarget.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                leftSection={<IconDeviceFloppy size={16} />}
                                onClick={handleUpdate}
                                loading={isUpdating}
                                variant="primary"
                                className="justify-center"
                            >
                                Save your changes
                            </Button>
                        </div>
                    </div>
                ),
            },
            {
                id: "details-modal-github" as const,
                title: "Create a repository",
                content: (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <TextInput
                                label="Name"
                                placeholder="Default name:"
                                className="w-full"
                                value={newName}
                                onChange={(evt) => setNewName(evt.currentTarget.value)}
                            />
                            <div className="flex items-center gap-1">
                                <IconExclamationCircle size={14} />
                                <p className="mb-0 text-xs">
                                    The repository will be created inside your personal GitHub account.
                                </p>
                            </div>
                        </div>
                        <Textarea
                            label="Description"
                            placeholder="What does this project do?"
                            className="w-full"
                            value={newDesc}
                            onChange={(evt) => setNewDesc(evt.currentTarget.value)}
                        />

                        <div className="flex items-center gap-2">
                            <Button
                                leftSection={<IconCloudUpload size={16} />}
                                onClick={handlePublish}
                                loading={isPublishing || checkAuthLoading}
                                disabled={!isAuthenticated}
                                variant="primary"
                                className="justify-center"
                            >
                                Create repository
                            </Button>
                            {!isAuthenticated && <p className="mb-0 text-sm">Not logged in.</p>}
                        </div>
                    </div>
                ),
            },
        ],
        [selectedRepo, opened, onClose],
    );

    const activeTabContent = useMemo(() => tabData.find((tab) => tab.id === activeTab)?.content, [tabData, activeTab]);

    useEffect(() => {
        setNewName(selectedRepo.name);
        setNewDesc(selectedRepo.description);
    }, [opened, selectedRepo]);

    useEffect(() => {
        void checkGitHubAuth();
    }, []);

    return (
        <Modal opened={opened} onClose={onClose} title="Project details" centered size="lg">
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
        </Modal>
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
