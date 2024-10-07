'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Problem } from '../types/algebraGuideTypes';
import ControlPanel from './ControlPanel';

const MathProblem: React.FC<Problem> = ({
                                            title,
                                            courseName,
                                            topicName,
                                            moduleName,
                                            description,
                                            introText,
                                            transitionTexts,
                                            finalStatement,
                                            problemStatement,
                                            solutions,
                                        }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stage, setStage] = useState<'overview' | 'intro' | 'problem' | 'task' | 'steps' | 'final' | 'transition'>('overview');
    const [currentSolution, setCurrentSolution] = useState(0);
    const [currentStep, setCurrentStep] = useState(-1);
    const [currentStepPart, setCurrentStepPart] = useState(0);
    const [started, setStarted] = useState(false);
    const [displayedContent, setDisplayedContent] = useState<JSX.Element[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedStage = searchParams.get('stage') || 'overview';
        const savedSolution = parseInt(searchParams.get('solution') || '0');
        const savedStep = parseInt(searchParams.get('step') || '-1');
        const savedStepPart = parseInt(searchParams.get('stepPart') || '0');

        setStage(savedStage as any);
        setCurrentSolution(savedSolution);
        setCurrentStep(savedStep);
        setCurrentStepPart(savedStepPart);
        setStarted(savedStage !== 'overview');

        rebuildContent(savedStage as any, savedSolution, savedStep, savedStepPart);
    }, []);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [displayedContent]);

    useEffect(() => {
        const params = new URLSearchParams();
        params.set('stage', stage);
        params.set('solution', currentSolution.toString());
        params.set('step', currentStep.toString());
        params.set('stepPart', currentStepPart.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    }, [stage, currentSolution, currentStep, currentStepPart]);

    const addContent = (content: JSX.Element) => {
        setDisplayedContent(prev => [...prev, content]);
    };

    const rebuildContent = (currentStage: string, solutionIndex: number, stepIndex: number, stepPartIndex: number) => {
        setDisplayedContent([]);
        if (currentStage === 'overview' || !started) return;

        if (currentStage === 'intro' || currentStage === 'problem' || currentStage === 'task') {
            addContent(<p key="intro" className="text-base">{introText}</p>);
        }
        if (currentStage === 'intro') return;

        if (currentStage === 'problem' || currentStage === 'task' || currentStage === 'steps' || currentStage === 'final') {
            addContent(
                <div key="problem" className="space-y-2">
                    <p className="text-base">{problemStatement.text}</p>
                    <BlockMath math={problemStatement.equation} />
                    <p className="text-base">{problemStatement.instruction}</p>
                </div>
            );
        }
        if (currentStage === 'problem') return;

        if (currentStage === 'task' || currentStage === 'steps' || currentStage === 'final') {
            addContent(<p key={`task-${solutionIndex}`} className="text-base">{solutions[solutionIndex].task}</p>);
        }
        if (currentStage === 'task') return;

        if (currentStage === 'steps' || currentStage === 'final') {
            for (let i = 0; i <= stepIndex; i++) {
                const step = solutions[solutionIndex].steps[i];
                addContent(<h4 key={`step-${solutionIndex}-${i}-title`} className="font-semibold text-lg mt-4">{step.title}</h4>);
                if (i < stepIndex || stepPartIndex > 0) addContent(<BlockMath key={`step-${solutionIndex}-${i}-equation`} math={step.equation} />);
                if ((i < stepIndex || stepPartIndex > 1) && step.explanation) {
                    addContent(<p key={`step-${solutionIndex}-${i}-explanation`} className="text-base">{step.explanation}</p>);
                }
                if ((i < stepIndex || stepPartIndex > 2) && step.simplified) {
                    addContent(
                        <div key={`step-${solutionIndex}-${i}-simplified`}>
                            <p className="text-base">Simplified:</p>
                            <BlockMath math={step.simplified} />
                        </div>
                    );
                }
            }
        }
        if (currentStage === 'steps') return;

        if (currentStage === 'final') {
            addContent(
                <div key={`final-answer-${solutionIndex}`} className="space-y-2 mt-4">
                    <h3 className="text-xl font-semibold">Final Answer</h3>
                    <BlockMath math={solutions[solutionIndex].finalAnswer} />
                </div>
            );
        }

        if (currentStage === 'transition' && solutionIndex < solutions.length - 1) {
            addContent(<p key={`transition-${solutionIndex}`} className="text-base">{transitionTexts[solutionIndex]}</p>);
        }
    };

    const nextStep = () => {
        let newStage = stage;
        let newSolution = currentSolution;
        let newStep = currentStep;
        let newStepPart = currentStepPart;

        if (!started) {
            newStage = 'intro';
            setStarted(true);
        } else if (stage === 'intro') {
            newStage = 'problem';
        } else if (stage === 'problem') {
            newStage = 'task';
        } else if (stage === 'task') {
            newStage = 'steps';
            newStep = 0;
            newStepPart = 0;
        } else if (stage === 'steps') {
            const step = solutions[currentSolution].steps[currentStep];
            if (currentStepPart < 3 && ((currentStepPart === 1 && step.explanation) || (currentStepPart === 2 && step.simplified))) {
                newStepPart = currentStepPart + 1;
            } else if (currentStep < solutions[currentSolution].steps.length - 1) {
                newStep = currentStep + 1;
                newStepPart = 0;
            } else {
                newStage = 'final';
            }
        } else if (stage === 'final') {
            if (currentSolution < solutions.length - 1) {
                newSolution = currentSolution + 1;
                newStage = 'transition';
            } else {
                newStage = 'overview';
                setStarted(false);
            }
        } else if (stage === 'transition') {
            newStage = 'task';
            newStep = -1;
            newStepPart = 0;
        }

        setStage(newStage);
        setCurrentSolution(newSolution);
        setCurrentStep(newStep);
        setCurrentStepPart(newStepPart);
        rebuildContent(newStage, newSolution, newStep, newStepPart);
    };

    const previousStep = () => {
        let newStage = stage;
        let newSolution = currentSolution;
        let newStep = currentStep;
        let newStepPart = currentStepPart;

        if (stage === 'intro') {
            newStage = 'overview';
            setStarted(false);
        } else if (stage === 'problem') {
            newStage = 'intro';
        } else if (stage === 'task') {
            newStage = 'problem';
        } else if (stage === 'steps') {
            if (currentStepPart > 0) {
                newStepPart = currentStepPart - 1;
            } else if (currentStep > 0) {
                newStep = currentStep - 1;
                newStepPart = 3;
            } else {
                newStage = 'task';
            }
        } else if (stage === 'final') {
            newStage = 'steps';
            newStep = solutions[currentSolution].steps.length - 1;
            newStepPart = 3;
        } else if (stage === 'transition') {
            newStage = 'final';
            newSolution = currentSolution - 1;
        }

        setStage(newStage);
        setCurrentSolution(newSolution);
        setCurrentStep(newStep);
        setCurrentStepPart(newStepPart);
        rebuildContent(newStage, newSolution, newStep, newStepPart);
    };

    const reset = () => {
        setStage('overview');
        setCurrentSolution(0);
        setCurrentStep(-1);
        setCurrentStepPart(0);
        setStarted(false);
        setDisplayedContent([]);
    };

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-grow overflow-y-auto" ref={contentRef}>
                <CardContent className="p-4">
                    {!started && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
                    {!started && (
                        <div className="space-y-2 mb-4">
                            <p className="text-base">Course: {courseName}</p>
                            <p className="text-base">Topic: {topicName}</p>
                            <p className="text-base">Module: {moduleName}</p>
                            <p className="text-base">{description}</p>
                        </div>
                    )}

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

                    {stage === 'overview' && started && (
                        <p className="mt-4 text-base">{finalStatement}</p>
                    )}
                </CardContent>
            </Card>

            <ControlPanel
                onReset={reset}
                onBack={previousStep}
                onNext={nextStep}
                started={started}
            />
        </div>
    );
};

export default MathProblem;
