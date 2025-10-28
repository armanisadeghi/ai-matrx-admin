'use client';

import React, { useState, useRef, useEffect, JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Problem, Solution } from '../../../../../features/math/types/algebraGuideTypes';
import ControlPanel from './ControlPanel';

const MathProblem: React.FC<Problem> = ({
                                            id,
                                            title,
                                            courseName,
                                            topicName,
                                            moduleName,
                                            description,
                                            introText,
                                            finalStatement,
                                            problemStatement,
                                            solutions,
                                        }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isNewSolution, setIsNewSolution] = useState(true);
    const [isFinalSolution, setIsFinalSolution] = useState(false);
    const [isFinalStep, setIsFinalStep] = useState(false);
    const [stage, setStage] = useState<'overview' | 'intro' | 'solution'>('overview');
    const [subStage, setSubStage] = useState<'steps' | 'solutionAnswer' | 'transition' | 'finalStatement'>('steps');
    const [displayedContent, setDisplayedContent] = useState<JSX.Element[]>([]);
    const [showCongratulations, setShowCongratulations] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedStage = searchParams.get('stage') || 'overview';
        const savedSubStage = searchParams.get('subStage') || 'steps';
        const savedSolution = parseInt(searchParams.get('solution') || '0');
        const savedStep = parseInt(searchParams.get('step') || '-1');

        setStage(savedStage as any);
        setSubStage(savedSubStage as any);
        setCurrentSolutionIndex(savedSolution);
        setCurrentStepIndex(savedStep);
        setIsNewSolution(savedStage === 'solution' && savedSubStage === 'steps' && savedStep === 0);
        setIsFinalSolution(isLastSolution(savedSolution));
        setIsFinalStep(isLastStep(savedSolution, savedStep));

        rebuildContent();
    }, []);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [displayedContent]);

    useEffect(() => {
        const params = new URLSearchParams();
        params.set('stage', stage);
        params.set('subStage', subStage);
        params.set('solution', currentSolutionIndex.toString());
        params.set('step', currentStepIndex.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    }, [stage, subStage, currentSolutionIndex, currentStepIndex]);

    const isLastSolution = (index: number = currentSolutionIndex) => index === solutions.length - 1;
    const isLastStep = (solutionIndex: number = currentSolutionIndex, stepIndex: number = currentStepIndex) =>
        stepIndex === solutions[solutionIndex].steps.length - 1;
    const hasTransitionText = (solutionIndex: number = currentSolutionIndex) =>
        !!solutions[solutionIndex].transitionText;

    const addContent = (content: JSX.Element) => {
        setDisplayedContent(prev => [...prev, content]);
    };

    const rebuildContent = () => {
        setDisplayedContent([]);

        if (stage === 'overview') {
            addContent(
                <div key="overview" className="space-y-2">
                    <h2 className="text-2xl font-bold mb-4">{title}</h2>
                    <p className="text-base">Course: {courseName}</p>
                    <p className="text-base">Topic: {topicName}</p>
                    <p className="text-base">Module: {moduleName}</p>
                    <p className="text-base">{description}</p>
                </div>
            );
            return;
        }

        if (stage === 'intro' || stage === 'solution') {
            if (stage === 'intro') {
                addContent(<p key="intro" className="text-base mb-4">{introText}</p>);
            }

            addContent(
                <div key="problem-statement" className="space-y-2 mb-4">
                    <p className="text-base">{problemStatement.text}</p>
                    <BlockMath math={problemStatement.equation} />
                    <p className="text-base">{problemStatement.instruction}</p>
                </div>
            );
        }

        if (stage === 'solution') {
            const currentSolution = solutions[currentSolutionIndex];
            addContent(<p key={`task-${currentSolutionIndex}`} className="text-base mb-4">{currentSolution.task}</p>);

            if (subStage === 'steps') {
                for (let i = 0; i <= currentStepIndex; i++) {
                    const step = currentSolution.steps[i];
                    addContent(
                        <div key={`step-${currentSolutionIndex}-${i}`} className="mb-4">
                            <h4 className="font-semibold text-lg">{step.title}</h4>
                            <BlockMath math={step.equation} />
                            {step.explanation && <p className="text-base">{step.explanation}</p>}
                        </div>
                    );
                }
            } else if (subStage === 'solutionAnswer') {
                addContent(
                    <div key={`final-answer-${currentSolutionIndex}`} className="space-y-2 mt-4">
                        <h3 className="text-xl font-semibold">Final Answer</h3>
                        <BlockMath math={currentSolution.solutionAnswer} />
                    </div>
                );
            } else if (subStage === 'transition' && currentSolution.transitionText) {
                addContent(<p key={`transition-${currentSolutionIndex}`} className="text-base">{currentSolution.transitionText}</p>);
            } else if (subStage === 'finalStatement') {
                addContent(<p key="final-statement" className="text-base">{finalStatement}</p>);
            }
        }
    };

    const nextStep = () => {
        if (stage === 'overview') {
            setStage('intro');
        } else if (stage === 'intro') {
            setStage('solution');
            setSubStage('steps');
            setCurrentStepIndex(0);
            setIsNewSolution(true);
            setIsFinalSolution(isLastSolution());
            setIsFinalStep(isLastStep());
        } else if (stage === 'solution') {
            if (isNewSolution) {
                setIsNewSolution(false);
            } else if (subStage === 'steps') {
                if (!isFinalStep) {
                    setCurrentStepIndex(currentStepIndex + 1);
                    setIsFinalStep(isLastStep(currentSolutionIndex, currentStepIndex + 1));
                } else {
                    setSubStage('solutionAnswer');
                }
            } else if (subStage === 'solutionAnswer') {
                if (hasTransitionText()) {
                    setSubStage('transition');
                } else if (!isFinalSolution) {
                    setCurrentSolutionIndex(currentSolutionIndex + 1);
                    setCurrentStepIndex(0);
                    setIsNewSolution(true);
                    setIsFinalSolution(isLastSolution(currentSolutionIndex + 1));
                    setIsFinalStep(false);
                    setSubStage('steps');
                } else {
                    setSubStage('finalStatement');
                }
            } else if (subStage === 'transition') {
                if (!isFinalSolution) {
                    setCurrentSolutionIndex(currentSolutionIndex + 1);
                    setCurrentStepIndex(0);
                    setIsNewSolution(true);
                    setIsFinalSolution(isLastSolution(currentSolutionIndex + 1));
                    setIsFinalStep(false);
                    setSubStage('steps');
                } else {
                    setSubStage('finalStatement');
                }
            } else if (subStage === 'finalStatement') {
                setShowCongratulations(true);
            }
        }

        rebuildContent();
    };

    const previousStep = () => {
        if (stage === 'intro') {
            setStage('overview');
        } else if (stage === 'solution') {
            if (subStage === 'steps') {
                if (currentStepIndex > 0) {
                    setCurrentStepIndex(currentStepIndex - 1);
                    setIsFinalStep(false);
                } else {
                    setStage('intro');
                    setCurrentSolutionIndex(0);
                    setCurrentStepIndex(-1);
                    setIsNewSolution(true);
                    setIsFinalSolution(false);
                    setIsFinalStep(false);
                }
            } else if (subStage === 'solutionAnswer') {
                setSubStage('steps');
                setCurrentStepIndex(solutions[currentSolutionIndex].steps.length - 1);
                setIsFinalStep(true);
            } else if (subStage === 'transition') {
                setSubStage('solutionAnswer');
            } else if (subStage === 'finalStatement') {
                if (hasTransitionText()) {
                    setSubStage('transition');
                } else {
                    setSubStage('solutionAnswer');
                }
            }
        }

        rebuildContent();
    };

    const reset = () => {
        setStage('overview');
        setSubStage('steps');
        setCurrentSolutionIndex(0);
        setCurrentStepIndex(-1);
        setIsNewSolution(true);
        setIsFinalSolution(false);
        setIsFinalStep(false);
        setShowCongratulations(false);
        rebuildContent();
    };

    if (showCongratulations) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
                <div className="space-x-4">
                    <Button onClick={reset}>Review Again</Button>
                    <Button onClick={() => router.push('/tests/math')}>Choose Another Lesson</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-grow overflow-y-auto" ref={contentRef}>
                <CardContent className="p-4">
                    <div className="space-y-4">
                        {displayedContent.map((content, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {content}
                            </motion.div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <ControlPanel
                onReset={reset}
                onBack={previousStep}
                onNext={nextStep}
                started={stage !== 'overview'}
            />
        </div>
    );
};

export default MathProblem;
