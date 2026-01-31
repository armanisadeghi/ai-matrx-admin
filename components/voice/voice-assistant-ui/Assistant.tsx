"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/tts/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { Mic, MicOff, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { nanoid } from 'nanoid';
import { ProcessState, Message, Conversation } from "@/types/voice/voiceAssistantTypes";
import StatusIndicator from "./StatusIndicator";
import ProcessIndicator from "./ProcessIndicator";
import MessagesDisplay from "./MessagesDisplay";

export default function Home() {
    const [input, setInput] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>(() => {
        // Load messages from localStorage if available
        const savedMessages = localStorage.getItem('voice-messages');
        return savedMessages ? JSON.parse(savedMessages) : [];
    });
    const [processState, setProcessState] = useState<ProcessState>({
        recording: false,
        processing: false,
        transcribing: false,
        generating: false,
        speaking: false,
    });
    const [currentTranscript, setCurrentTranscript] = useState<string>("");
    const player = usePlayer();

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('voice-messages', JSON.stringify(messages));
    }, [messages]);

    const vad = useMicVAD({
        startOnLoad: true,
        onSpeechStart: () => {
            setProcessState(prev => ({ ...prev, recording: true }));
        },
        onSpeechEnd: async (audio) => {
            setProcessState(prev => ({
                ...prev,
                recording: false,
                processing: true
            }));
            const wav = utils.encodeWAV(audio);
            const blob = new Blob([wav], { type: "audio/wav" });
            await submit(blob);
            const isFirefox = navigator.userAgent.includes("Firefox");
            if (isFirefox) vad.pause();
        },
        onVADMisfire: () => {
            console.log("VAD misfire");
            toast.warning("Speech detection was too short");
        },
        positiveSpeechThreshold: 0.6,
        minSpeechMs: 4, // Fixed: was minSpeechFrames, should be minSpeechMs
        redemptionFrames: 8,
        preSpeechPadFrames: 1,
        baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.22/dist/",
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/",
    });

    useEffect(() => {
        if (vad.errored) {
            console.error('VAD Error:', vad.errored);
            toast.error("Failed to initialize voice detection");
        }
    }, [vad.errored]);

    async function submit(data: string | Blob) {
        const formData = new FormData();

        if (data instanceof Blob) {
            formData.append("input", data, "audio.wav");
            setProcessState(prev => ({ ...prev, transcribing: true }));
        } else {
            formData.append("input", data);
        }

        messages.forEach((message) => {
            formData.append("message", JSON.stringify(message));
        });

        try {
            const response = await fetch("/api/voice", {
                method: "POST",
                body: formData,
            });

            const transcript = decodeURIComponent(
                response.headers.get("X-Transcript") || ""
            );
            const text = decodeURIComponent(
                response.headers.get("X-Response") || ""
            );

            if (!response.ok || !transcript || !text || !response.body) {
                throw new Error(
                    response.status === 429
                    ? "Too many requests. Please try again later."
                    : "An error occurred."
                );
            }

            setCurrentTranscript(transcript);
            setProcessState(prev => ({
                ...prev,
                transcribing: false,
                generating: true
            }));

            const latency = Date.now() - new Date().getTime();
            setProcessState(prev => ({
                ...prev,
                generating: false,
                speaking: true
            }));

            player.play(response.body, () => {
                const isFirefox = navigator.userAgent.includes("Firefox");
                if (isFirefox) vad.start();
                setProcessState(prev => ({ ...prev, speaking: false }));
            });

            setMessages((prev) => [
                ...prev,
                {
                    id: nanoid(),
                    role: "user",
                    content: transcript,
                    timestamp: Date.now()
                },
                {
                    id: nanoid(),
                    role: "assistant",
                    content: text,
                    latency,
                    timestamp: Date.now()
                },
            ]);
            setInput(transcript);
        } catch (error: any) {
            toast.error(error.message || "An error occurred.");
            setProcessState({
                recording: false,
                processing: false,
                transcribing: false,
                generating: false,
                speaking: false,
            });
        }
    }

    const handleSubmit = () => {
        if (!input.trim()) return;
        submit(input);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Status Card */}
            <Card className="mb-4 mx-4">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Voice Assistant
                        <StatusIndicator vad={vad} processState={processState} />
                    </CardTitle>
                    <CardDescription>
                        Speak or type your message below
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProcessIndicator state={processState} />
                </CardContent>
            </Card>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-24">
                <MessagesDisplay messages={messages} />

                {currentTranscript && (
                    <Alert className="mb-4">
                        <AlertTitle>Current Transcript Assistants</AlertTitle>
                        <AlertDescription>{currentTranscript}</AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Speech Halo Effect */}
            {processState.recording && (
                <div className="fixed inset-0 pointer-events-none">
                    <motion.div
                        className="absolute inset-0 bg-primary/5 rounded-full"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.2, 0.5]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>
            )}

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
                        whileTap={{ scale: 0.9 }}
                    >
                        {vad.listening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </motion.button>
                    <motion.button
                        onClick={handleSubmit}
                        className="p-4 rounded-full bg-primary text-primary-foreground"
                        disabled={!input.trim()}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Send className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
