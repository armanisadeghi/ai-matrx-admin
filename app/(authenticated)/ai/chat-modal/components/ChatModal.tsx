// File: components/ChatModal.tsx

"use client";

import React, {useState} from "react";
import {Modal, ModalContent, ModalBody, Button, ScrollShadow} from "@nextui-org/react";
import {Icon} from "@iconify/react";
import Conversation from "../../next-components/conversation";
import PromptInputWithBottomActions from "../../next-components/prompt-input-with-bottom-actions";

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarVisible(!isSidebarVisible);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="full"
            classNames={{
                base: "max-w-[90vw] max-h-[90vh] m-auto",
                backdrop: "backdrop-blur-sm backdrop-opacity-50",
            }}
            scrollBehavior="inside"
        >
            <ModalContent className="h-[90vh]">
                {(onClose) => (
                    <ModalBody className="p-0 overflow-hidden">
                        <div className="relative flex h-full w-full overflow-hidden rounded-lg bg-background shadow-2xl transition-all duration-300 ease-in-out">
                            {/* 3D border effect */}
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-secondary opacity-50 blur-sm"></div>

                            {/* Collapsible sidebar */}
                            <div
                                className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                                    isSidebarVisible ? "w-64" : "w-2"
                                }`}
                                onMouseEnter={() => setIsSidebarVisible(true)}
                                onMouseLeave={() => setIsSidebarVisible(false)}
                            >
                                <div className="h-full bg-gray-100 p-4">
                                    <h2 className="mb-4 text-lg font-semibold">Conversations</h2>
                                    {/* Add your conversation list here */}
                                </div>
                            </div>

                            {/* Main chat area */}
                            <div className="relative flex h-full w-full flex-col p-6">
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="absolute left-2 top-2 z-10"
                                    onClick={toggleSidebar}
                                >
                                    <Icon icon={isSidebarVisible ? "mdi:chevron-left" : "mdi:chevron-right"} width={24} />
                                </Button>

                                <ScrollShadow className="flex-grow overflow-y-auto mb-4">
                                    <Conversation />
                                </ScrollShadow>

                                <div className="mt-auto">
                                    <PromptInputWithBottomActions />
                                    <p className="px-2 text-tiny text-default-400 mt-2">
                                        AI can make mistakes. Consider checking important information.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ChatModal;
