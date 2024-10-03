// File: pages/ChatPage.tsx

'use client';

import { useState } from 'react';
import { Button } from "@nextui-org/react";
import ChatModal from './components/ChatModal';

const ChatPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    return (
        <div className="flex items-center justify-center h-screen">
            <Button onClick={openModal} size="lg">
                Open Chat
            </Button>

            <ChatModal isOpen={isModalOpen} onClose={closeModal} />
        </div>
    );
};

export default ChatPage;