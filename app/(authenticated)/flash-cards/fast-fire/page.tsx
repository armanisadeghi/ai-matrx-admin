'use client';
import React, {useState} from 'react';
import {motion, AnimatePresence} from "framer-motion";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Play, Pause, Ban, Volume2, Award, Mic} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {cn} from "@/lib/utils";
import {useFastFireSession, FAST_FIRE_CONFIG} from "@/hooks/flashcard-app/useFastFireFlashcards";

const FastFirePractice = (
    {
    }) => {

    
    const fastFireHook = useFastFireSession();
    
    const {
        isActive,
        isPaused,
        isProcessing,
        isRecording,
        currentCardIndex,
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
        playAllAudioFeedback,
        playCorrectAnswersOnly,
        playHighScoresOnly,
        totalCards,
    } = fastFireHook;

    const [isExpanded, setIsExpanded] = useState(false);

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const correctAnswers = results.filter((r) => r.correct).length;
    const overallPercentage = totalCards > 0 ? Math.round((totalScore / (totalCards * 6)) * 100) : 0;
    const progressPercentage = isInBufferPhase
                               ? (bufferTimeLeft / FAST_FIRE_CONFIG.bufferTimerSeconds) * 100
                               : (timeLeft / FAST_FIRE_CONFIG.answerTimerSeconds) * 100;
    const audioScale = isRecording ? 1 + (audioLevel / 255) * 0.5 : 1;
    const audioOpacity = isRecording ? 0.3 + (audioLevel / 255) * 0.7 : 1;

    const renderSessionControls = () => {
        if (!isActive && !isPaused) {
            return (
                <Button
                    variant="default"
                    size="sm"
                    onClick={startSession}
                    disabled={isProcessing}
                >
                    <Play className="h-4 w-4 mr-1"/>
                    Start Session
                </Button>
            );
        }

        if (isActive && !isPaused) {
            return (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={pauseSession}
                        disabled={isProcessing}
                    >
                        <Pause className="h-4 w-4 mr-1"/>
                        Pause
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={stopSession}
                        disabled={isProcessing}
                    >
                        <Ban className="h-4 w-4 mr-1"/>
                        Stop
                    </Button>
                </>
            );
        }

        return (
            <>
                <Button
                    variant="default"
                    size="sm"
                    onClick={resumeSession}
                    disabled={isProcessing}
                >
                    <Play className="h-4 w-4 mr-1"/>
                    Resume
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={stopSession}
                    disabled={isProcessing}
                >
                    <Ban className="h-4 w-4 mr-1"/>
                    Stop
                </Button>
            </>
        );
    };

    return (
        <div className="container mx-auto py-8 pb-[160px] space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Fast Fire Practice</h1>
                <div className="space-x-4">
                    <Button
                        variant="outline"
                        onClick={playAllAudioFeedback}
                        disabled={results.length === 0 || isProcessing}
                    >
                        <Play className="mr-2 h-4 w-4"/>
                        Review All
                    </Button>
                    <Button
                        variant="outline"
                        onClick={playCorrectAnswersOnly}
                        disabled={results.length === 0 || isProcessing}
                    >
                        Review Correct
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => playHighScoresOnly(4)}
                        disabled={results.length === 0 || isProcessing}
                    >
                        Review Best
                    </Button>
                </div>
            </header>

            {!currentCard || !isActive ? (
                <div className="flex items-center justify-center h-64">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="p-6 text-center">
                            <h2 className="text-2xl font-bold mb-4">Ready to Practice</h2>
                            <p className="text-muted-foreground">
                                {totalCards} cards in this set. Click Start when ready.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                 <div className="w-full max-w-2xl mx-auto">
                     <AnimatePresence mode="sync">
                         <motion.div
                             key={currentCardIndex}
                             initial={{x: 100, opacity: 0}}
                             animate={{x: 0, opacity: 1}}
                             exit={{x: -100, opacity: 0}}
                             transition={{type: "spring", stiffness: 300, damping: 30}}
                         >
                             <Card className="w-full">
                                 <CardContent className="p-6">
                                     <div className="text-sm text-muted-foreground mb-2">
                                         Card {currentCardIndex + 1} of {totalCards}
                                     </div>
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
                                             animate={{scale: audioScale}}
                                             transition={{duration: 0.1}}
                                         >
                                             {isRecording ? (
                                                 <Volume2
                                                     className="h-6 w-6 text-destructive"
                                                     style={{opacity: audioOpacity}}
                                                 />
                                             ) : (
                                                  <Mic className="h-6 w-6 text-muted-foreground"/>
                                              )}
                                         </motion.div>
                                     </div>
                                     <AnimatePresence mode="sync">
                                         {isInBufferPhase && (
                                             <motion.div
                                                 key="bufferPhase"
                                                 initial={{opacity: 0, y: 10}}
                                                 animate={{opacity: 1, y: 0}}
                                                 exit={{opacity: 0, y: -10}}
                                                 className="text-center mt-4 text-sm text-muted-foreground"
                                             >
                                                 Get ready to answer...
                                             </motion.div>
                                         )}
                                         {isRecording && (
                                             <motion.div
                                                 key="recordingPhase"
                                                 initial={{opacity: 0, y: 10}}
                                                 animate={{opacity: 1, y: 0}}
                                                 exit={{opacity: 0, y: -10}}
                                                 className="text-center mt-4 text-sm text-primary"
                                             >
                                                 Recording in progress...
                                             </motion.div>
                                         )}
                                         {isProcessing && (
                                             <motion.div
                                                key="processingPhase"
                                                initial={{opacity: 0, y: 10}}
                                                animate={{opacity: 1, y: 0}}
                                                exit={{opacity: 0, y: -10}}
                                                className="text-center mt-4 text-sm text-info"
                                            >
                                                Processing response...
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence mode="sync">
                {audioPlayer && (
                    <motion.div
                        key="audioPlayer"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                        className="fixed bottom-4 right-4"
                    >
                        <Card className="p-4">
                            <audio controls src={audioPlayer.src}/>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full">
                <Card className="border-t border-border">
                    <CardHeader className="p-4 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary"/>
                                Progress & Scoring
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {renderSessionControls()}
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
                                    <span>{isActive ? currentCardIndex + 1 : 0} / {totalCards}</span>
                                </div>
                                <Progress
                                    value={totalCards > 0 && isActive ? ((currentCardIndex + 1) / totalCards) * 100 : 0}
                                    className="h-2"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{totalScore}</div>
                                    <div className="text-sm text-muted-foreground">Total Score</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{correctAnswers}</div>
                                    <div className="text-sm text-muted-foreground">Correct</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{overallPercentage}%</div>
                                    <div className="text-sm text-muted-foreground">Overall</div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        key="resultsExpanded"
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: 'auto'}}
                                        exit={{opacity: 0, height: 0}}
                                        className="space-y-4"
                                    >
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isProcessing || !results.length}
                                                onClick={playAllAudioFeedback}
                                            >
                                                <Play className="h-4 w-4 mr-1"/>
                                                Play All
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isProcessing || !results.length}
                                                onClick={playCorrectAnswersOnly}
                                            >
                                                <Volume2 className="h-4 w-4 mr-1"/>
                                                Correct Only
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isProcessing || !results.length}
                                                onClick={() => playHighScoresOnly(4)}
                                            >
                                                Review Best
                                            </Button>
                                        </div>

                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {results.map((result, idx) => (
                                                <Card key={idx} className="p-2">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span
                                                                className={cn(
                                                                    "font-semibold",
                                                                    result.correct
                                                                    ? "text-success"
                                                                    : "text-destructive"
                                                                )}
                                                            >
                                                                Question {idx + 1}
                                                            </span>
                                                            <span className="ml-2 text-sm text-muted-foreground">
                                                                Score: {result.score}/6
                                                            </span>
                                                        </div>
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
        </div>
    );
};

export default FastFirePractice;
