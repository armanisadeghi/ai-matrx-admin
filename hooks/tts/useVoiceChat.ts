import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePlayer } from "@/hooks/tts/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { nanoid } from 'nanoid';
import { processAiRequest } from "@/actions/ai-actions/assistant-modular";
import { ProcessState, Message, Conversation } from "@/types/voice/voiceAssistantTypes";
import { assistantOptions } from "@/constants/voice-assistants";


function truncateTitle(content: string): string {
    return content.split(' ').slice(0, 4).join(' ') +
        (content.split(' ').length > 4 ? '...' : '');
}

export const useVoiceChat = () => {
    const [input, setInput] = useState<string>("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssistant, setSelectedAssistant] = useState(assistantOptions[0]);
    const [processState, setProcessState] = useState<ProcessState>({
        recording: false,
        processing: false,
        transcribing: false,
        generating: false,
        speaking: false,
    });
    const [currentTranscript, setCurrentTranscript] = useState<string>("");
    const player = usePlayer();

    // Initialize VAD
    const vad = useMicVAD({
        startOnLoad: true,
        onSpeechStart: () => {
            setProcessState(prev => ({ ...prev, recording: true }));
        },
        onSpeechEnd: async (audio) => {
            try {
                setProcessState(prev => ({
                    ...prev,
                    recording: false,
                    processing: true
                }));

                const wav = utils.encodeWAV(audio);
                const audioBlob = new Blob([wav], { type: "audio/wav" });
                await submit(audioBlob);

                // Handle Firefox-specific behavior
                const isFirefox = navigator.userAgent.includes("Firefox");
                if (isFirefox) vad.pause();
            } catch (error) {
                console.error('Speech processing error:', error);
                toast.error("Failed to process speech");
                setProcessState(prev => ({
                    ...prev,
                    recording: false,
                    processing: false
                }));
            }
        },
        onVADMisfire: () => {
            console.log("VAD misfire");
            toast.warning("Speech detection was too short");
            setProcessState(prev => ({
                ...prev,
                recording: false,
                processing: false
            }));
        },
        positiveSpeechThreshold: 0.6,
        minSpeechFrames: 4,
        redemptionFrames: 8,
        preSpeechPadFrames: 1,
        baseAssetPath: "/",
        onnxWASMBasePath: "/",
    });

    // Load conversations from localStorage
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const savedConversations = await localStorage.getItem('voice-conversations');
                const parsedConversations: Conversation[] = savedConversations
                                                            ? JSON.parse(savedConversations)
                                                            : [];

                setConversations(parsedConversations);

                if (parsedConversations.length > 0) {
                    setCurrentConversationId(parsedConversations[0].id);
                } else {
                    createNewConversation();
                }
            } catch (error) {
                console.error('Error loading conversations:', error);
                createNewConversation();
            } finally {
                setIsLoading(false);
            }
        };

        loadConversations();
    }, []);

    // Save conversations to localStorage
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('voice-conversations', JSON.stringify(conversations));
        }
    }, [conversations, isLoading]);

    // VAD error handling
    useEffect(() => {
        if (vad.errored) {
            console.error('VAD Error:', vad.errored);
            toast.error("Failed to initialize voice detection");
        }
    }, [vad.errored]);

    const createNewConversation = () => {
        const newConversation: Conversation = {
            id: nanoid(),
            title: `Conversation ${conversations.length + 1}`,
            messages: [],
            timestamp: Date.now()
        };
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
    };

    const deleteConversation = (id: string) => {
        setConversations(prev => prev.filter(conv => conv.id !== id));
        if (currentConversationId === id) {
            const remaining = conversations.filter(conv => conv.id !== id);
            if (remaining.length > 0) {
                setCurrentConversationId(remaining[0].id);
            } else {
                createNewConversation();
            }
        }
    };

    const addMessage = (userMessage: Message, assistantMessage: Message) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id === currentConversationId) {
                return {
                    ...conv,
                    messages: [...conv.messages, userMessage, assistantMessage],
                    title: conv.messages.length === 0 ?
                           truncateTitle(userMessage.content) : conv.title
                };
            }
            return conv;
        }));
    };

    const submit = async (data: string | Blob) => {
        try {
            setProcessState(prev => ({
                ...prev,
                transcribing: data instanceof Blob,
                processing: true
            }));

            const currentConversation = conversations.find(c => c.id === currentConversationId);
            const previousMessages = currentConversation?.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })) ?? [];

            const input = data instanceof Blob
                          ? new File([data], 'audio.wav', { type: 'audio/wav' })
                          : data;

            const result = await processAiRequest({
                input,
                inputType: data instanceof Blob ? 'audio' : 'text',
                responseType: 'audio',
                assistantType: selectedAssistant.value,
                previousMessages,
            });

            setCurrentTranscript(result.transcript || '');
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

            if (result.responseType === 'audio' && result.voiceStream) {
                player.play(result.voiceStream, () => {
                    const isFirefox = navigator.userAgent.includes("Firefox");
                    if (isFirefox) vad.start();
                    setProcessState(prev => ({ ...prev, speaking: false }));
                });
            }

            const userMessage: Message = {
                id: nanoid(),
                role: "user",
                content: result.transcript || (typeof data === 'string' ? data : ''),
                timestamp: Date.now()
            };

            const assistantMessage: Message = {
                id: nanoid(),
                role: "assistant",
                content: typeof result.response === 'string' ? result.response : '[Stream]',
                latency,
                timestamp: Date.now()
            };

            addMessage(userMessage, assistantMessage);

            if (data instanceof Blob) {
                setInput(result.transcript || '');
            } else {
                setInput('');
            }

        } catch (error: any) {
            console.error('Error in submit:', error);
            toast.error(error.message || "An error occurred.");
            setProcessState({
                recording: false,
                processing: false,
                transcribing: false,
                generating: false,
                speaking: false,
            });
        }
    };

    const handleSubmit = () => {
        if (!input.trim()) return;
        submit(input);
        setInput("");
    };

    return {
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
        getCurrentConversation: () => conversations.find(c => c.id === currentConversationId),
        selectedAssistant,
        setSelectedAssistant,
        isLoading,
    };
};
