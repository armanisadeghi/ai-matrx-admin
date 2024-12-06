import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapseToggleButton } from '@/components/layout/CollapseToggleButton';
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";
import AssistantSelect from './AssistantSelect';
import VoiceSelect from './VoiceSelect';
import { CurrentAssistantDisplay } from './CurrentAssistantDisplay';
import { ConversationMenuItem } from './ConversationMenuItem';

interface CollapsibleSidebarProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

const CollapsibleSidebar = ({ voiceChatHook }: CollapsibleSidebarProps) => {
    const {
        conversations,
        currentConversationId,
        createNewConversation,
        assistant,
    } = voiceChatHook;

    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="relative group/sidebar">
            <motion.div
                initial={{ width: 240 }}
                animate={{ width: isOpen ? 240 : 0 }}
                className="h-full bg-background border-r"
            >
                <div className={`h-full flex flex-col ${!isOpen && 'hidden'}`}>
                    <div className="flex-none p-3 space-y-4 border-b">
                        {assistant && (
                            <>
                                <CurrentAssistantDisplay assistant={assistant} />
                                <AssistantSelect voiceChatHook={voiceChatHook} />
                            </>
                        )}

                        <VoiceSelect voiceChatHook={voiceChatHook} />

                        <Button
                            onClick={createNewConversation}
                            variant="secondary"
                            size="sm"
                            className="w-full rounded-md"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Chat
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {conversations.map(conv => (
                            <ConversationMenuItem
                                key={conv.id}
                                voiceChatHook={voiceChatHook}
                                conversationId={conv.id}
                                title={conv.title}
                                isActive={conv.id === currentConversationId}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>

            <div className="absolute top-4 -right-5 z-50">
                <CollapseToggleButton
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                />
            </div>
        </div>
    );
};

export default CollapsibleSidebar;
