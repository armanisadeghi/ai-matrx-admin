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
    isInInitialCountdown: boolean;
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
    isInInitialCountdown: boolean;
    initialCountdownLeft: number;
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

// Centralized configuration for fast-fire session
export const FAST_FIRE_CONFIG = {
    // Timer settings
    answerTimerSeconds: 10,
    bufferTimerSeconds: 3,
    initialCountdownSeconds: 3,
    
    // Voice AI settings
    voiceConfig: {
        apiName: 'openai' as ApiName,
        voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22',
        responseType: 'audio' as const,
        temperature: 0.5,
        maxTokens: 2000
    },
    
    // Audio settings
    startSoundPath: '/sounds/2-second-start-beep-sound.mp3',
    endSoundPath: '/sounds/end-buzzer-sound.mp3',
    
    // Flashcard settings
    flashcardSet: 'historyFlashcards' as const,
} as const;

const assistant = getAssistant('flashcardGrader');

export const useFastFireSession = (): UseFastFireSessionReturn => {
    const {toast} = useToast();

    // Fetch flashcards internally and ensure they have IDs
    const flashcards = getFlashcardSet(FAST_FIRE_CONFIG.flashcardSet).map((card, index) => ({
        ...card,
        id: card.id || `flashcard-${Date.now()}-${index}`
    }));
    const flashcardsRef = useRef<FlashcardData[]>(flashcards);

    const [sessionState, setSessionState] = useState<SessionState>({
        isActive: false,
        isPaused: false,
        isProcessing: false,
        isRecording: false,
        currentCardIndex: -1,
        isInInitialCountdown: false
    });

    const [results, setResults] = useState<FlashcardResult[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>(FAST_FIRE_CONFIG.answerTimerSeconds);
    const [bufferTimeLeft, setBufferTimeLeft] = useState<number>(FAST_FIRE_CONFIG.bufferTimerSeconds);
    const [initialCountdownLeft, setInitialCountdownLeft] = useState<number>(FAST_FIRE_CONFIG.initialCountdownSeconds);
    const [isInBufferPhase, setIsInBufferPhase] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const startSound = useRef<HTMLAudioElement | undefined>(undefined);
    const endSound = useRef<HTMLAudioElement | undefined>(undefined);
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const animationFrame = useRef<number | undefined>(undefined);
    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
        setAiCallParams,
        setPartialBrokers
    } = useDynamicVoiceAiProcessing(assistant);

    const totalCards = flashcardsRef.current.length;

    const cleanup = useCallback(async () => {
        try {
            // Clear timers
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
            
            // Clear animation frames
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
                animationFrame.current = undefined;
            }
            
            // Close audio context
            if (audioContext.current && audioContext.current.state !== 'closed') {
                await audioContext.current.close().catch(err => {
                    console.warn('Error closing audio context:', err);
                });
            }
            
            // Stop media recorder and tracks
            if (mediaRecorder.current) {
                if (mediaRecorder.current.state === 'recording') {
                    mediaRecorder.current.stop();
                }
                if (mediaRecorder.current.stream) {
                    mediaRecorder.current.stream.getTracks().forEach(track => {
                        try {
                            track.stop();
                        } catch (err) {
                            console.warn('Error stopping track:', err);
                        }
                    });
                }
                mediaRecorder.current = null;
            }
            
            // Reset refs and state
            audioContext.current = null;
            analyser.current = null;
            audioChunks.current = [];
            setAudioLevel(0);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }, []);

    const stopSession = useCallback(async () => {
        try {
            await cleanup();
            setSessionState({
                isActive: false,
                isPaused: false,
                isProcessing: false,
                isRecording: false,
                currentCardIndex: -1,
                isInInitialCountdown: false
            });
            setTimeLeft(FAST_FIRE_CONFIG.answerTimerSeconds);
            setBufferTimeLeft(FAST_FIRE_CONFIG.bufferTimerSeconds);
            setInitialCountdownLeft(FAST_FIRE_CONFIG.initialCountdownSeconds);
            setIsInBufferPhase(true);
        } catch (error) {
            console.error('Error stopping session:', error);
            toast({
                title: "Error",
                description: "There was an error stopping the session. The page may need to be refreshed.",
                variant: "destructive"
            });
        }
    }, [cleanup, toast]);

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
        setTimeLeft(FAST_FIRE_CONFIG.answerTimerSeconds);
        setBufferTimeLeft(FAST_FIRE_CONFIG.bufferTimerSeconds);
        setIsInBufferPhase(true);
        return true;
    }, [sessionState.currentCardIndex, stopSession, toast]);

    const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
        const currentIndex = sessionState.currentCardIndex;
        const currentFlashcard = flashcardsRef.current[currentIndex];
        if (!currentFlashcard) {
            await stopSession();
            return;
        }

        setSessionState(prev => ({...prev, isProcessing: true}));
        try {
            // Set flashcard context for AI grading
            setPartialBrokers([
                { id: 'flashcardFront', value: currentFlashcard.front },
                { id: 'flashcardBack', value: currentFlashcard.back }
            ]);
            
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
                cardId: currentFlashcard.id || `card-${currentIndex}`,
                timestamp: Date.now()
            }]);
            await moveToNextCard();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to process response",
                variant: "destructive"
            });
            setTimeLeft(FAST_FIRE_CONFIG.answerTimerSeconds);
            setBufferTimeLeft(FAST_FIRE_CONFIG.bufferTimerSeconds);
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
    }, [sessionState.currentCardIndex, submit, getCurrentConversation, moveToNextCard, stopSession, toast, setPartialBrokers]);

    const startRecording = useCallback(async () => {
        // Check browser support
        if (!navigator.mediaDevices?.getUserMedia) {
            toast({
                title: "Browser Not Supported",
                description: "Audio recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.",
                variant: "destructive"
            });
            await stopSession();
            return;
        }
        
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Set up audio context for visualization
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new AudioContext();
                analyser.current = audioContext.current.createAnalyser();
                analyser.current.fftSize = 256;
                const source = audioContext.current.createMediaStreamSource(stream);
                source.connect(analyser.current);
            }
            
            // Create media recorder with best available format
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                             ? 'audio/webm;codecs=opus'
                             : MediaRecorder.isTypeSupported('audio/webm')
                             ? 'audio/webm'
                             : 'audio/mp4'; // Fallback for Safari
            
            const recorder = new MediaRecorder(stream, { mimeType });
            
            // Handle data chunks
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };
            
            // Handle recording completion
            recorder.onstop = async () => {
                try {
                    if (audioChunks.current.length === 0) {
                        throw new Error('No audio data recorded');
                    }
                    const audioBlob = new Blob(audioChunks.current, {type: mimeType});
                    await handleRecordingComplete(audioBlob);
                } catch (error) {
                    console.error('Error processing recording:', error);
                    toast({
                        title: "Recording Error",
                        description: "Failed to process the audio recording. Please try again.",
                        variant: "destructive"
                    });
                    setSessionState(prev => ({
                        ...prev,
                        isProcessing: false,
                        isRecording: false
                    }));
                }
            };
            
            // Handle recording errors
            recorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                toast({
                    title: "Recording Error",
                    description: "An error occurred during recording. Please try again.",
                    variant: "destructive"
                });
                stopSession();
            };
            
            mediaRecorder.current = recorder;
            
            // Play start sound
            try {
                await startSound.current?.play();
            } catch (err) {
                console.warn('Could not play start sound:', err);
            }
            
            // Start recording
            recorder.start();
            
            // Set up audio visualization
            const updateAudio = () => {
                if (!analyser.current) return;
                const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
                analyser.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(average);
                animationFrame.current = requestAnimationFrame(updateAudio);
            };
            updateAudio();
            
            // Update state
            setSessionState(prev => ({...prev, isRecording: true}));
            
        } catch (error: any) {
            console.error('Error starting recording:', error);
            
            let errorMessage = "Unable to access microphone. ";
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += "Please grant microphone permissions and try again.";
            } else if (error.name === 'NotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone.";
            } else if (error.name === 'NotReadableError') {
                errorMessage += "Microphone is already in use by another application.";
            } else {
                errorMessage += "Please check your microphone settings and try again.";
            }
            
            toast({
                title: "Microphone Error",
                description: errorMessage,
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
            currentCardIndex: -1, // Stay at -1 during initial countdown
            isInInitialCountdown: true
        });
        setResults([]);
        setTimeLeft(FAST_FIRE_CONFIG.answerTimerSeconds);
        setBufferTimeLeft(FAST_FIRE_CONFIG.bufferTimerSeconds);
        setInitialCountdownLeft(FAST_FIRE_CONFIG.initialCountdownSeconds);
        setIsInBufferPhase(true);
    }, [createNewConversation, toast]);

    const pauseSession = useCallback(() => {
        // Save current state before pausing
        setSessionState(prev => ({...prev, isPaused: true}));
        
        // Stop recording if active
        if (mediaRecorder.current?.state === 'recording') {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
        
        // Timer cleanup happens in useEffect
    }, []);

    const resumeSession = useCallback(() => {
        // Resume with current timer values preserved
        setSessionState(prev => ({
            ...prev,
            isPaused: false,
            isRecording: false // Reset recording state on resume
        }));
        // Timer will restart automatically via useEffect
    }, []);

    useEffect(() => {
        setApiName(FAST_FIRE_CONFIG.voiceConfig.apiName);
        setAiCallParams({
            temperature: FAST_FIRE_CONFIG.voiceConfig.temperature,
            maxTokens: FAST_FIRE_CONFIG.voiceConfig.maxTokens,
            responseFormat: assistant.responseFormat,
        });
    }, [setApiName, setAiCallParams]);

    useEffect(() => {
        startSound.current = new Audio(FAST_FIRE_CONFIG.startSoundPath);
        endSound.current = new Audio(FAST_FIRE_CONFIG.endSoundPath);
        startSound.current.load();
        endSound.current.load();
        return () => {
            startSound.current = undefined;
            endSound.current = undefined;
        };
    }, []);

    // Timer management - cleaner implementation with proper state handling
    useEffect(() => {
        // Clear any existing timer when dependencies change
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
        }

        // Only run timer if session is active and not paused
        if (!sessionState.isActive || sessionState.isPaused || sessionState.isProcessing) {
            return;
        }

        // Initial countdown phase (before showing any cards)
        if (sessionState.isInInitialCountdown) {
            timerRef.current = setInterval(() => {
                setInitialCountdownLeft(prev => {
                    if (prev <= 1) {
                        // Initial countdown complete, move to first card
                        clearInterval(timerRef.current!);
                        timerRef.current = undefined;
                        setSessionState(prevState => ({
                            ...prevState,
                            isInInitialCountdown: false,
                            currentCardIndex: 0
                        }));
                        setInitialCountdownLeft(FAST_FIRE_CONFIG.initialCountdownSeconds);
                        setIsInBufferPhase(true);
                        setBufferTimeLeft(FAST_FIRE_CONFIG.bufferTimerSeconds);
                        return FAST_FIRE_CONFIG.initialCountdownSeconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        // Buffer phase timer (for each card)
        else if (isInBufferPhase && sessionState.currentCardIndex >= 0) {
            timerRef.current = setInterval(() => {
                setBufferTimeLeft(prev => {
                    if (prev <= 1) {
                        // Buffer phase complete, transition to recording
                        clearInterval(timerRef.current!);
                        timerRef.current = undefined;
                        setIsInBufferPhase(false);
                        // Start recording asynchronously without blocking
                        startRecording().catch(error => {
                            console.error('Failed to start recording:', error);
                            toast({
                                title: "Recording Error",
                                description: "Failed to start recording. Please try again.",
                                variant: "destructive"
                            });
                        });
                        return FAST_FIRE_CONFIG.bufferTimerSeconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        // Recording phase timer (only if actively recording)
        else if (sessionState.isRecording) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        // Time's up, stop recording
                        clearInterval(timerRef.current!);
                        timerRef.current = undefined;
                        stopRecording().catch(error => {
                            console.error('Failed to stop recording:', error);
                        });
                        return FAST_FIRE_CONFIG.answerTimerSeconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        // Cleanup on unmount or dependency change
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
        };
    }, [
        sessionState.isActive,
        sessionState.isPaused,
        sessionState.isProcessing,
        sessionState.isRecording,
        sessionState.isInInitialCountdown,
        sessionState.currentCardIndex,
        isInBufferPhase,
        startRecording,
        stopRecording,
        toast
    ]);

    const currentCard = sessionState.currentCardIndex >= 0 
        ? flashcardsRef.current[sessionState.currentCardIndex] 
        : undefined;

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
        isInInitialCountdown: sessionState.isInInitialCountdown,
        initialCountdownLeft,
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
