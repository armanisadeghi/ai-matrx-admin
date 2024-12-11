import {useState, useCallback, useRef, useEffect} from 'react';
import {useToast} from "@/components/ui/use-toast";
import {FlashcardData} from "@/types/flashcards.types";
import {useDynamicVoiceAiProcessing} from "@/hooks/ai/useDynamicVoiceAiProcessing";
import {ApiName, Assistant} from "@/types/voice/voiceAssistantTypes";
import {getFlashcardSet} from '@/app/(authenticated)/flashcard/app-data';
import {getAssistant} from "@/constants/voice-assistants";

interface SessionState {
    isActive: boolean;
    isPaused: boolean;
    isRecording: boolean;
    currentCardIndex: number;
    isProcessing: boolean;
}

export interface FlashcardResult {
    correct: boolean;
    score: number;
    audioFeedback: string;
    timestamp: number;
    cardId: string;
}

interface UseFastFireSessionReturn {
    isActive: boolean;
    isPaused: boolean;
    isProcessing: boolean;
    isRecording: boolean;
    currentCardIndex: number;
    currentCard?: FlashcardData;
    results: FlashcardResult[];
    audioPlayer: HTMLAudioElement | null;
    timeLeft: number;
    bufferTimeLeft: number;
    isInBufferPhase: boolean;
    audioLevel: number;
    startSession: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    stopSession: () => Promise<void>;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    playAllAudioFeedback: () => void;
    playCorrectAnswersOnly: () => void;
    playHighScoresOnly: (minScore: number) => void;
    processState: any;
    totalCards: number;
}

const voiceConfig = {
    apiName: 'openai' as ApiName,
    voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22',
    responseType: 'audio',
    temperature: 0.5,
    maxTokens: 2000
};

const assistant = getAssistant('flashcardGrader');

const defaultTimer = 10;

export const useFastFireSession = (): UseFastFireSessionReturn => {
    const {toast} = useToast();

    // Fetch flashcards internally
    const flashcards = getFlashcardSet('historyFlashcards');
    const flashcardsRef = useRef<FlashcardData[]>(flashcards);

    const [sessionState, setSessionState] = useState<SessionState>({
        isActive: false,
        isPaused: false,
        isProcessing: false,
        isRecording: false,
        currentCardIndex: -1
    });

    const [results, setResults] = useState<FlashcardResult[]>([]);
    const [timeLeft, setTimeLeft] = useState(defaultTimer);
    const [bufferTimeLeft, setBufferTimeLeft] = useState(3);
    const [isInBufferPhase, setIsInBufferPhase] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const startSound = useRef<HTMLAudioElement>();
    const endSound = useRef<HTMLAudioElement>();
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const animationFrame = useRef<number>();
    const timerRef = useRef<NodeJS.Timeout>();

    const {
        submit,
        audioPlayer,
        playAllAudioFeedback,
        playCorrectAnswersOnly,
        playHighScoresOnly,
        processState,
        getCurrentConversation,
        createNewConversation,
        setApiName,
        setAiCallParams
    } = useDynamicVoiceAiProcessing(assistant);

    const totalCards = flashcardsRef.current.length;

    const cleanup = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        if (audioContext.current && audioContext.current.state !== 'closed') {
            await audioContext.current.close().catch(() => {});
        }
        if (mediaRecorder.current?.state === 'recording') {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
        audioContext.current = null;
        analyser.current = null;
        setAudioLevel(0);
    }, []);

    const stopSession = useCallback(async () => {
        await cleanup();
        setSessionState({
            isActive: false,
            isPaused: false,
            isProcessing: false,
            isRecording: false,
            currentCardIndex: -1
        });
    }, [cleanup]);

    const moveToNextCard = useCallback(async () => {
        const currentIndex = sessionState.currentCardIndex;
        if (currentIndex >= flashcardsRef.current.length - 1) {
            toast({
                title: "Session Complete",
                description: "You've completed all flashcards!",
                variant: "success"
            });
            await stopSession();
            return false;
        }
        setSessionState(prev => ({
            ...prev,
            currentCardIndex: prev.currentCardIndex + 1,
            isProcessing: false,
            isRecording: false
        }));
        setTimeLeft(defaultTimer);
        setBufferTimeLeft(3);
        setIsInBufferPhase(true);
        return true;
    }, [sessionState.currentCardIndex, stopSession]);

    const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
        const currentIndex = sessionState.currentCardIndex;
        const currentFlashcard = flashcardsRef.current[currentIndex];
        if (!currentFlashcard?.id) {
            await stopSession();
            return;
        }

        setSessionState(prev => ({...prev, isProcessing: true}));
        try {
            await submit(audioBlob);
            const conversation = getCurrentConversation();
            const lastResult = conversation?.structuredData?.[conversation.structuredData.length - 1];
            if (!lastResult) {
                throw new Error("No response received from AI");
            }
            setResults(prev => [...prev, {
                correct: lastResult.correct,
                score: lastResult.score,
                audioFeedback: lastResult.audioFeedback,
                cardId: currentFlashcard.id,
                timestamp: Date.now()
            }]);
            await moveToNextCard();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to process response",
                variant: "destructive"
            });
            setTimeLeft(defaultTimer);
            setBufferTimeLeft(3);
            setIsInBufferPhase(true);
            setSessionState(prev => ({
                ...prev,
                isProcessing: false,
                isRecording: false
            }));
        } finally {
            audioChunks.current = [];
            mediaRecorder.current = null;
        }
    }, [sessionState.currentCardIndex, submit, getCurrentConversation, moveToNextCard, stopSession, defaultTimer, toast]);

    const startRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast({
                title: "Error",
                description: "Audio recording is not supported in this browser",
                variant: "destructive"
            });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new AudioContext();
                analyser.current = audioContext.current.createAnalyser();
                analyser.current.fftSize = 256;
                const source = audioContext.current.createMediaStreamSource(stream);
                source.connect(analyser.current);
            }
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                             ? 'audio/webm;codecs=opus'
                             : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };
            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, {type: 'audio/webm'});
                await handleRecordingComplete(audioBlob);
            };
            mediaRecorder.current = recorder;
            await startSound.current?.play().catch(() => {});
            recorder.start();
            const updateAudio = () => {
                if (!analyser.current) return;
                const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
                analyser.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(average);
                animationFrame.current = requestAnimationFrame(updateAudio);
            };
            updateAudio();
            setSessionState(prev => ({...prev, isRecording: true}));
        } catch (error) {
            toast({
                title: "Microphone Error",
                description: "Unable to access microphone. Please check permissions.",
                variant: "destructive"
            });
            await stopSession();
        }
    }, [handleRecordingComplete, stopSession, toast]);

    const stopRecording = useCallback(async () => {
        if (mediaRecorder.current?.state === 'recording') {
            await endSound.current?.play().catch(() => {});
            mediaRecorder.current.stop();
            setSessionState(prev => ({...prev, isRecording: false}));
        }
    }, []);

    const startSession = useCallback(() => {
        if (flashcardsRef.current.length === 0) {
            toast({
                title: "No Flashcards",
                description: "There are no flashcards to practice.",
                variant: "destructive"
            });
            return;
        }
        createNewConversation();
        setSessionState({
            isActive: true,
            isPaused: false,
            isProcessing: false,
            isRecording: false,
            currentCardIndex: 0
        });
        setResults([]);
        setTimeLeft(defaultTimer);
        setBufferTimeLeft(3);
        setIsInBufferPhase(true);
    }, [createNewConversation, defaultTimer, toast]);

    const pauseSession = useCallback(() => {
        setSessionState(prev => ({...prev, isPaused: true}));
        if (mediaRecorder.current?.state === 'recording') {
            mediaRecorder.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    const resumeSession = useCallback(() => {
        setSessionState(prev => ({...prev, isPaused: false}));
    }, []);

    useEffect(() => {
        setApiName(voiceConfig.apiName);
        setAiCallParams({
            temperature: voiceConfig.temperature ?? 0.5,
            maxTokens: voiceConfig.maxTokens ?? 2000,
            responseFormat: assistant.responseFormat,
        });
    }, [assistant, voiceConfig, setApiName, setAiCallParams]);

    useEffect(() => {
        startSound.current = new Audio('/sounds/2-second-start-beep-sound.mp3');
        endSound.current = new Audio('/sounds/end-buzzer-sound.mp3');
        startSound.current.load();
        endSound.current.load();
        return () => {
            startSound.current = undefined;
            endSound.current = undefined;
        };
    }, []);

    // Main timer effect
    useEffect(() => {
        if (sessionState.isActive && !sessionState.isPaused) {
            if (isInBufferPhase) {
                timerRef.current = setInterval(() => {
                    setBufferTimeLeft(prev => {
                        const nextVal = prev - 1;
                        if (nextVal < 1) {
                            // Buffer ended, start recording next card
                            setIsInBufferPhase(false);
                            clearInterval(timerRef.current as NodeJS.Timeout);
                            timerRef.current = undefined;
                            startRecording();
                            return 3;
                        }
                        return nextVal;
                    });
                }, 1000);
            } else {
                // Recording phase
                timerRef.current = setInterval(() => {
                    setTimeLeft(prev => {
                        const nextVal = prev - 1;
                        if (nextVal < 1) {
                            // Time ended for this card, stop recording
                            clearInterval(timerRef.current as NodeJS.Timeout);
                            timerRef.current = undefined;
                            stopRecording();
                            setTimeLeft(defaultTimer);
                            setIsInBufferPhase(true);
                            return defaultTimer;
                        }
                        return nextVal;
                    });
                }, 1000);
            }
        } else {
            // Not active or paused
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
        };
    }, [sessionState.isActive, sessionState.isPaused, isInBufferPhase, startRecording, stopRecording]);

    const currentCard = flashcardsRef.current[sessionState.currentCardIndex];

    return {
        isActive: sessionState.isActive,
        isPaused: sessionState.isPaused,
        isProcessing: sessionState.isProcessing,
        isRecording: sessionState.isRecording,
        currentCardIndex: sessionState.currentCardIndex,
        currentCard,
        results,
        audioPlayer,
        timeLeft,
        bufferTimeLeft,
        isInBufferPhase,
        audioLevel,
        startSession,
        pauseSession,
        resumeSession,
        stopSession,
        startRecording,
        stopRecording,
        playAllAudioFeedback,
        playCorrectAnswersOnly,
        playHighScoresOnly,
        processState,
        totalCards
    };
};
