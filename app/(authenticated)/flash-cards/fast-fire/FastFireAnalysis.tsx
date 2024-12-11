'use client';

import {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Play, Pause, Ban, Volume2, Award, Timer, SkipForward} from "lucide-react";
import {Progress} from "@/components/ui/progress";

interface FastFireResult {
    correct: boolean;
    score: number;
    audioFeedback: string;
}

interface FastFireAnalysisProps {
    results?: FastFireResult[];
    currentIndex: number;
    totalCards: number;
    isProcessing?: boolean;
    onStart?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onStop?: () => void;
    onTimeUp?: () => void;
    isActive?: boolean;
    isPaused?: boolean;
}

const FastFireAnalysis = (
    {
        results = [],
        currentIndex,
        totalCards,
        isProcessing = false,
        onStart,
        onPause,
        onResume,
        onStop,
        onTimeUp,
        isActive = false,
        isPaused = false,
    }: FastFireAnalysisProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const audioBeep = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioBeep.current = new Audio('/sounds/end-buzzer-sound.mp3');
        return () => {
            if (audioBeep.current) {
                audioBeep.current = null;
            }
        };
    }, []);

    const playBeep = () => {
        if (audioBeep.current) {
            audioBeep.current.currentTime = 0;
            audioBeep.current.play().catch(console.error);
        }
    };

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxPossibleScore = totalCards * 6;
    const correctAnswers = results.filter(r => r.correct).length;

    return (
        <div className="w-full">
            <Card className="border-t border-border">
                <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary"/>
                            Progress & Scoring
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {!isActive && !isPaused && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={onStart}
                                    disabled={isProcessing}
                                >
                                    <Play className="h-4 w-4 mr-1"/>
                                    Start Session
                                </Button>
                            )}
                            {isActive && !isPaused && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onPause}
                                        disabled={isProcessing}
                                    >
                                        <Pause className="h-4 w-4 mr-1"/>
                                        Pause
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onStop}
                                        disabled={isProcessing}
                                    >
                                        <Ban className="h-4 w-4 mr-1"/>
                                        Stop
                                    </Button>
                                </>
                            )}
                            {isPaused && (
                                <>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={onResume}
                                        disabled={isProcessing}
                                    >
                                        <Play className="h-4 w-4 mr-1"/>
                                        Resume
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onStop}
                                        disabled={isProcessing}
                                    >
                                        <Ban className="h-4 w-4 mr-1"/>
                                        Stop
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? 'Show Less' : 'Show More'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{currentIndex + 1} / {totalCards}</span>
                            </div>
                            <Progress
                                value={((currentIndex + 1) / totalCards) * 100}
                                className="h-2"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {totalScore}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Total Score
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {correctAnswers}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Correct
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {Math.round((totalScore / maxPossibleScore) * 100)}%
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Overall
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: 'auto'}}
                                    exit={{opacity: 0, height: 0}}
                                    className="space-y-4"
                                >
                                    <div className="flex justify-center gap-2">
                                        <Button variant="outline" size="sm" disabled={isProcessing}>
                                            <Play className="h-4 w-4 mr-1"/>
                                            Play All
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={isProcessing}>
                                            <Volume2 className="h-4 w-4 mr-1"/>
                                            Correct Only
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {results.map((result, idx) => (
                                            <Card key={idx} className="p-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className={`font-semibold ${
                                                            result.correct ? 'text-success' : 'text-destructive'
                                                        }`}>
                                                            Question {idx + 1}
                                                        </span>
                                                        <span className="ml-2 text-sm text-muted-foreground">
                                                            Score: {result.score}/6
                                                        </span>
                                                    </div>
                                                    <Button variant="ghost" size="sm">
                                                        <Play className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FastFireAnalysis;
