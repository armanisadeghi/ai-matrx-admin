'use client';

import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Mic, Volume2, AlertCircle} from 'lucide-react';
import {FlashcardData} from "@/types/flashcards.types";
import {useToast} from "@/components/ui/use-toast";

interface FastFireProps {
    initialData: FlashcardData[];
    onComplete: (audioBlob: Blob, flashcardId: string) => Promise<void>;
    defaultTimer?: number;
    disabled?: boolean;
    isActive?: boolean;
    isPaused?: boolean;
    currentCard?: FlashcardData;
}

const FastFireFlashcard = (
    {
        initialData,
        onComplete,
        defaultTimer = 5,
        disabled = false,
        isActive = false,
        isPaused = false,
        currentCard
    }: FastFireProps) => {
    const {toast} = useToast();
    const [timeLeft, setTimeLeft] = useState(defaultTimer);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [bufferTimeLeft, setBufferTimeLeft] = useState(3); // Increased buffer time
    const [isInBufferPhase, setIsInBufferPhase] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);
    const audioChunks = useRef<Blob[]>([]);
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const animationFrame = useRef<number>();
    const beepSound = useRef<HTMLAudioElement | null>(null);
    const startSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        beepSound.current = new Audio('/sounds/end-buzzer-sound.mp3');
        startSound.current = new Audio('/sounds/2-second-start-beep-sound.mp3');

        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
            audioContext.current?.close();
        };
    }, []);

    const playSound = async (sound: HTMLAudioElement | null) => {
        if (sound) {
            sound.currentTime = 0;
            try {
                await sound.play();
            } catch (error) {
                console.error('Error playing sound:', error);
                toast({
                    title: "Sound Error",
                    description: "Unable to play sound notification",
                    variant: "destructive"
                });
            }
        }
    };

    const updateAudioLevel = () => {
        if (!analyser.current) return;

        const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
        analyser.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);

        animationFrame.current = requestAnimationFrame(updateAudioLevel);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});

            // Set up audio analysis
            audioContext.current = new AudioContext();
            analyser.current = audioContext.current.createAnalyser();
            const source = audioContext.current.createMediaStreamSource(stream);
            source.connect(analyser.current);

            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, {type: 'audio/webm'});
                if (currentCard?.id) {
                    await onComplete(audioBlob, currentCard.id);
                }
                audioChunks.current = [];

                if (animationFrame.current) {
                    cancelAnimationFrame(animationFrame.current);
                }
                setAudioLevel(0);
            };

            setMediaRecorder(recorder);
            recorder.start();
            setIsRecording(true);
            await playSound(startSound.current);
            updateAudioLevel();

            toast({
                title: "Recording Started",
                description: "Speak your answer now",
                duration: 2000
            });
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast({
                title: "Microphone Error",
                description: "Unable to access microphone",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        if (!currentCard || disabled || !isActive || isPaused) {
            stopRecording();
            return;
        }

        let timer: NodeJS.Timeout;

        if (isInBufferPhase) {
            timer = setInterval(() => {
                setBufferTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsInBufferPhase(false);
                        startRecording();
                        return 3; // Reset for next card
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        playSound(beepSound.current);
                        stopRecording();
                        setTimeLeft(defaultTimer); // Reset for next card
                        setIsInBufferPhase(true);
                        return defaultTimer;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timer);
    }, [isActive, isPaused, disabled, currentCard, isInBufferPhase]);

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    if (!currentCard || !isActive) {
        return (
            <div className="flex items-center justify-center h-64">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-2xl font-bold mb-4">Ready to Practice</h2>
                        <p className="text-muted-foreground">
                            {initialData.length} cards in this set. Click Start when ready.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progressPercentage = isInBufferPhase
                               ? (bufferTimeLeft / 3) * 100
                               : (timeLeft / defaultTimer) * 100;

    return (
        <div className="w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentCard.id}
                    initial={{x: 100, opacity: 0}}
                    animate={{x: 0, opacity: 1}}
                    exit={{x: -100, opacity: 0}}
                    transition={{type: "spring", stiffness: 300, damping: 30}}
                >
                    <Card className="w-full">
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold text-center mb-8">
                                {currentCard.front}
                            </div>

                            <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-4">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-primary"
                                    initial={{width: "100%"}}
                                    animate={{width: `${progressPercentage}%`}}
                                    transition={{duration: 0.1}}
                                />
                            </div>

                            <div className="flex justify-center items-center gap-4">
                                <div className="text-3xl font-bold">
                                    {isInBufferPhase ? bufferTimeLeft : timeLeft}
                                </div>
                                <motion.div
                                    animate={isRecording ? {
                                        scale: [1, 1 + (audioLevel / 255) * 0.5, 1],
                                    } : {}}
                                    transition={{duration: 0.1}}
                                >
                                    {isRecording ? (
                                        <Volume2
                                            className="h-6 w-6 text-destructive"
                                            style={{
                                                opacity: 0.3 + (audioLevel / 255) * 0.7
                                            }}
                                        />
                                    ) : (
                                         <Mic className="h-6 w-6 text-muted-foreground"/>
                                     )}
                                </motion.div>
                            </div>

                            {isInBufferPhase && (
                                <div className="text-center mt-4 text-sm text-muted-foreground">
                                    Get ready to answer...
                                </div>
                            )}

                            {isRecording && (
                                <motion.div
                                    initial={{opacity: 0}}
                                    animate={{opacity: 1}}
                                    className="text-center mt-4 text-sm text-primary"
                                >
                                    Recording in progress...
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default FastFireFlashcard;
