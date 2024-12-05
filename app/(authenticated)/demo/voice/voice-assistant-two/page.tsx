"use client";
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import MessagesDisplay from "@/components/voice/voice-assistant-ui/MessagesDisplay";
import SpeechHaloEffect from "@/components/voice/voice-assistant-ui/SpeechHaloEffect";
import { Header } from "@/components/voice/voice-assistant-ui/header";
import { Sidebar } from "@/components/voice/voice-assistant-ui/Sidebar";
import { Footer } from "@/components/voice/voice-assistant-ui/Footer";
import {assistantOptions} from "@/constants/voice-assistants";
import {useVoiceChat} from "@/hooks/tts/useVoiceChat";
import {NestedResizableWithHeaderFooter} from "@/components/matrx/resizable/NestedDynamicWithRenderControls";

export default function Page() {
    const {
        input,
        setInput,
        conversations,
        currentConversationId,
        currentTranscript,
        processState,
        vad,
        selectedAssistant,
        setSelectedAssistant,
        createNewConversation,
        deleteConversation,
        setCurrentConversationId,
        handleSubmit,
        getCurrentConversation,
    } = useVoiceChat();

    const currentConversation = getCurrentConversation();
    const messages = currentConversation?.messages || [];

    const layout = {
        type: 'nested' as const,
        direction: 'horizontal' as const,
        sections: [
            {
                type: 'content' as const,
                content: (
                    <Sidebar
                        conversations={conversations}
                        currentConversationId={currentConversationId}
                        onNewConversation={createNewConversation}
                        onSelectConversation={setCurrentConversationId}
                        onDeleteConversation={deleteConversation}
                    />
                ),
                defaultSize: 10,
                minSize: 15,
                maxSize: 20,
                collapsible: true,
            },
            {
                type: 'nested' as const,
                direction: 'vertical' as const,
                sections: [
                    {
                        type: 'content' as const,
                        content: (
                            <Header
                                selectedAssistant={selectedAssistant}
                                onAssistantChange={(value) => {
                                    const assistant = assistantOptions.find(a => a.value === value);
                                    if (assistant) setSelectedAssistant(assistant);
                                }}
                                vad={vad}
                                processState={processState}
                            />
                        ),
                        defaultSize: 10,
                    },
                    {
                        type: 'content' as const,
                        content: (
                            <div className="relative h-full">
                                <div className="absolute inset-0 overflow-y-auto px-4">
                                    <MessagesDisplay messages={messages}/>
                                </div>
                                {(processState.recording && vad.listening) && <SpeechHaloEffect/>}
                            </div>
                        ),
                        defaultSize: 90,
                    },
                    {
                        type: 'content' as const,
                        content: (
                            <Footer
                                input={input}
                                onInputChange={setInput}
                                onSubmit={handleSubmit}
                                isListening={vad.listening}
                                onToggleMic={() => vad.listening ? vad.pause() : vad.start()}
                            />
                        ),
                        defaultSize: 5,
                    },
                ],
            },
        ],
    };

    return (
        <NestedResizableWithHeaderFooter layout={layout} />
    );
}
