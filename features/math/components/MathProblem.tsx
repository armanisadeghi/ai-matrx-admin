"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MathProblemProps, Solution } from "../types";
import ControlPanel from "./ControlPanel";
import InlineMathText from "./InlineMathText";

const MathProblem: React.FC<MathProblemProps> = ({
    id,
    title,
    course_name,
    topic_name,
    module_name,
    description,
    intro_text,
    final_statement,
    problem_statement,
    solutions,
}) => {
    const router = useRouter();
    const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isNewSolution, setIsNewSolution] = useState(true);
    const [isFinalSolution, setIsFinalSolution] = useState(false);
    const [isFinalStep, setIsFinalStep] = useState(false);
    const [stage, setStage] = useState<"overview" | "intro" | "solution">("overview");
    const [subStage, setSubStage] = useState<"steps" | "solutionAnswer" | "transition" | "finalStatement">("steps");
    const [displayedContent, setDisplayedContent] = useState<JSX.Element[]>([]);
    const [showCongratulations, setShowCongratulations] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    // Initial content load
    useEffect(() => {
        rebuildContent();
    }, []);

    // Auto-scroll to bottom when content changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [displayedContent]);

    const isLastSolution = (index: number = currentSolutionIndex) => index === solutions.length - 1;
    const isLastStep = (solutionIndex: number = currentSolutionIndex, stepIndex: number = currentStepIndex) =>
        stepIndex === solutions[solutionIndex].steps.length - 1;
    const hasTransitionText = (solutionIndex: number = currentSolutionIndex) => !!solutions[solutionIndex].transitionText;

    const addContent = (content: JSX.Element) => {
        setDisplayedContent((prev) => [...prev, content]);
    };

    const rebuildContent = () => {
        setDisplayedContent([]);

        if (stage === "overview") {
            addContent(
                <div key="overview" className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                        <h2 className="text-2xl font-bold mb-2"><InlineMathText text={title} /></h2>
                        {description && <p className="text-muted-foreground"><InlineMathText text={description} /></p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-card rounded-lg p-3 border">
                            <div className="text-xs text-muted-foreground mb-1">Course</div>
                            <div className="font-semibold text-sm">{course_name}</div>
                        </div>
                        <div className="bg-card rounded-lg p-3 border">
                            <div className="text-xs text-muted-foreground mb-1">Topic</div>
                            <div className="font-semibold text-sm">{topic_name}</div>
                        </div>
                        <div className="bg-card rounded-lg p-3 border">
                            <div className="text-xs text-muted-foreground mb-1">Module</div>
                            <div className="font-semibold text-sm">{module_name}</div>
                        </div>
                    </div>
                </div>
            );
            return;
        }

        if (stage === "intro" || stage === "solution") {
            if (stage === "intro") {
                addContent(
                    <p key="intro" className="text-base mb-4">
                        <InlineMathText text={intro_text} />
                    </p>
                );
            }

            addContent(
                <div key="problem-statement" className="space-y-2 mb-4">
                    <p className="text-base"><InlineMathText text={problem_statement.text} /></p>
                    <BlockMath math={problem_statement.equation} />
                    <p className="text-base"><InlineMathText text={problem_statement.instruction} /></p>
                </div>
            );
        }

        if (stage === "solution") {
            const currentSolution = solutions[currentSolutionIndex];
            addContent(
                <p key={`task-${currentSolutionIndex}`} className="text-base mb-4">
                    <InlineMathText text={currentSolution.task} />
                </p>
            );

            if (subStage === "steps") {
                // Safety check: ensure we don't exceed array bounds
                const maxStepIndex = Math.min(currentStepIndex, currentSolution.steps.length - 1);
                for (let i = 0; i <= maxStepIndex; i++) {
                    const step = currentSolution.steps[i];
                    if (step) {
                        addContent(
                            <div key={`step-${currentSolutionIndex}-${i}`} className="mb-4">
                                <h4 className="font-semibold text-lg"><InlineMathText text={step.title} /></h4>
                                <BlockMath math={step.equation} />
                                {step.explanation && <p className="text-base"><InlineMathText text={step.explanation} /></p>}
                            </div>
                        );
                    }
                }
            } else if (subStage === "solutionAnswer") {
                addContent(
                    <div key={`final-answer-${currentSolutionIndex}`} className="space-y-2 mt-4">
                        <h3 className="text-xl font-semibold">Final Answer</h3>
                        <BlockMath math={currentSolution.solutionAnswer} />
                    </div>
                );
            } else if (subStage === "transition" && currentSolution.transitionText) {
                addContent(
                    <p key={`transition-${currentSolutionIndex}`} className="text-base">
                        <InlineMathText text={currentSolution.transitionText} />
                    </p>
                );
            } else if (subStage === "finalStatement") {
                addContent(
                    <p key="final-statement" className="text-base">
                        <InlineMathText text={final_statement} />
                    </p>
                );
            }
        }
    };

    const nextStep = () => {
        if (stage === "overview") {
            setStage("intro");
            setTimeout(() => rebuildContent(), 0);
        } else if (stage === "intro") {
            setStage("solution");
            setSubStage("steps");
            setCurrentStepIndex(0);
            setIsNewSolution(true);
            setIsFinalSolution(isLastSolution());
            setIsFinalStep(isLastStep());
            setTimeout(() => rebuildContent(), 0);
        } else if (stage === "solution") {
            if (isNewSolution) {
                setIsNewSolution(false);
                rebuildContent();
            } else if (subStage === "steps") {
                if (!isFinalStep) {
                    const nextStep = currentStepIndex + 1;
                    setCurrentStepIndex(nextStep);
                    setIsFinalStep(isLastStep(currentSolutionIndex, nextStep));
                    rebuildContent();
                } else {
                    setSubStage("solutionAnswer");
                    rebuildContent();
                }
            } else if (subStage === "solutionAnswer") {
                if (hasTransitionText()) {
                    setSubStage("transition");
                    rebuildContent();
                } else if (!isFinalSolution) {
                    const nextSolution = currentSolutionIndex + 1;
                    setCurrentSolutionIndex(nextSolution);
                    setCurrentStepIndex(0);
                    setIsNewSolution(true);
                    setIsFinalSolution(isLastSolution(nextSolution));
                    setIsFinalStep(false);
                    setSubStage("steps");
                    rebuildContent();
                } else {
                    setSubStage("finalStatement");
                    rebuildContent();
                }
            } else if (subStage === "transition") {
                if (!isFinalSolution) {
                    const nextSolution = currentSolutionIndex + 1;
                    setCurrentSolutionIndex(nextSolution);
                    setCurrentStepIndex(0);
                    setIsNewSolution(true);
                    setIsFinalSolution(isLastSolution(nextSolution));
                    setIsFinalStep(false);
                    setSubStage("steps");
                    rebuildContent();
                } else {
                    setSubStage("finalStatement");
                    rebuildContent();
                }
            } else if (subStage === "finalStatement") {
                setShowCongratulations(true);
            }
        }
    };

    const previousStep = () => {
        if (stage === "intro") {
            setStage("overview");
            rebuildContent();
        } else if (stage === "solution") {
            if (subStage === "steps") {
                if (currentStepIndex > 0) {
                    setCurrentStepIndex(currentStepIndex - 1);
                    setIsFinalStep(false);
                    rebuildContent();
                } else {
                    setStage("intro");
                    setCurrentSolutionIndex(0);
                    setCurrentStepIndex(-1);
                    setIsNewSolution(true);
                    setIsFinalSolution(false);
                    setIsFinalStep(false);
                    rebuildContent();
                }
            } else if (subStage === "solutionAnswer") {
                setSubStage("steps");
                setCurrentStepIndex(solutions[currentSolutionIndex].steps.length - 1);
                setIsFinalStep(true);
                rebuildContent();
            } else if (subStage === "transition") {
                setSubStage("solutionAnswer");
                rebuildContent();
            } else if (subStage === "finalStatement") {
                if (hasTransitionText()) {
                    setSubStage("transition");
                } else {
                    setSubStage("solutionAnswer");
                }
                rebuildContent();
            }
        }
    };

    const reset = () => {
        setStage("overview");
        setSubStage("steps");
        setCurrentSolutionIndex(0);
        setCurrentStepIndex(-1);
        setIsNewSolution(true);
        setIsFinalSolution(false);
        setIsFinalStep(false);
        setShowCongratulations(false);
        // Rebuild content after state updates
        setTimeout(() => rebuildContent(), 0);
    };

    if (showCongratulations) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
                <div className="space-x-4">
                    <Button onClick={reset}>Review Again</Button>
                    <Button onClick={() => router.push("/education/math")}>Choose Another Lesson</Button>
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

            <ControlPanel onReset={reset} onBack={previousStep} onNext={nextStep} started={stage !== "overview"} />
        </div>
    );
};

export default MathProblem;
