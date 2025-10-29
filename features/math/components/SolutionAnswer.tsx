"use client";

import React from "react";
import { BlockMath } from "react-katex";
import InlineMathText from "./InlineMathText";
import "katex/dist/katex.min.css";

interface SolutionAnswerProps {
    answer: string;
    className?: string;
}

/**
 * Smart component that renders solution answers
 * Handles both pure LaTeX and mixed text with embedded LaTeX
 * 
 * Detects format:
 * - Pure LaTeX: "x = 4" → renders with BlockMath
 * - Mixed text with LaTeX: "The answer is \\(x = 4\\)" → renders with InlineMathText
 * - Multi-line text: splits on \n and renders each line
 */
const SolutionAnswer: React.FC<SolutionAnswerProps> = ({ answer, className = "" }) => {
    if (!answer) return null;

    // Detect if this is mixed text (contains inline math delimiters or newlines)
    const hasMixedText = /\\\(.*?\\\)|\$[^$]+?\$|\\n/.test(answer);

    if (hasMixedText) {
        // Handle mixed text with potential newlines
        const lines = answer.split('\\n');
        
        return (
            <div className={`space-y-2 ${className}`}>
                {lines.map((line, index) => (
                    <div key={index} className="text-sm leading-relaxed">
                        <InlineMathText text={line} />
                    </div>
                ))}
            </div>
        );
    }

    // Pure LaTeX - render as block math
    try {
        return (
            <div className={className}>
                <BlockMath math={answer} />
            </div>
        );
    } catch (error) {
        // Fallback if LaTeX rendering fails
        console.warn("Failed to render solution answer as LaTeX:", answer, error);
        return (
            <div className={`text-sm ${className}`}>
                <InlineMathText text={answer} />
            </div>
        );
    }
};

export default SolutionAnswer;

