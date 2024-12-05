"use client";
import React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Send, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import StatusIndicator from "@/components/voice/voice-assistant-ui/StatusIndicator";
import MessagesDisplay from "@/components/voice/voice-assistant-ui/MessagesDisplay";
import ConversationTab from "@/components/voice/voice-assistant-ui/ConversationTab";
import SpeechHaloEffect from "@/components/voice/voice-assistant-ui/SpeechHaloEffect";
import ProcessIndicator from "@/components/voice/voice-assistant-ui/ProcessIndicator";
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";

export default function Page() {
    const {
        input,
        setInput,
        conversations,
        currentConversationId,
        currentTranscript,
        processState,
        vad,
        createNewConversation,
        deleteConversation,
        setCurrentConversationId,
        handleSubmit,
        getCurrentConversation,
    } = useVoiceChat();

    const currentConversation = getCurrentConversation();
    const messages = currentConversation?.messages || [];

    return (
        <div className="flex flex-col h-full relative">
            {/* Conversation Selector */}
            <div className="flex items-center gap-2 p-4">
                <Button
                    onClick={createNewConversation}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <Plus className="w-4 h-4"/>
                    New Conversation
                </Button>
                <div className="flex-1 overflow-x-auto flex gap-2">
                    {conversations.map(conv => (
                        <ConversationTab
                            key={conv.id}
                            conversation={conv}
                            isActive={conv.id === currentConversationId}
                            onSelect={() => setCurrentConversationId(conv.id)}
                            onDelete={() => deleteConversation(conv.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Status Card */}
            <Card className="mb-4 mx-4">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Voice Assistant
                        <StatusIndicator vad={vad} processState={processState}/>
                    </CardTitle>
                    <CardDescription>
                        Speak or type your message below
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProcessIndicator state={processState}/>
                </CardContent>
            </Card>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-24">
                <MessagesDisplay messages={messages}/>

            </div>

            {/* Speech Halo Effect */}
            {(processState.recording && vad.listening) && <SpeechHaloEffect/>}

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t">
                <div className="max-w-4xl mx-auto p-4 flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            className="w-full p-4 rounded-lg bg-background border focus:ring-2 focus:ring-primary"
                            placeholder={vad.listening ? "Listening... or type your message" : "Type your message"}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>
                    <motion.button
                        type="button"
                        className={`p-4 rounded-full ${vad.listening ? 'bg-red-500 text-white' : 'bg-muted'}`}
                        onClick={() => vad.listening ? vad.pause() : vad.start()}
                        whileTap={{scale: 0.9}}
                    >
                        {vad.listening ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
                    </motion.button>
                    <motion.button
                        onClick={handleSubmit}
                        className="p-4 rounded-full bg-primary text-primary-foreground"
                        disabled={!input.trim()}
                        whileTap={{scale: 0.9}}
                    >
                        <Send className="w-5 h-5"/>
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
