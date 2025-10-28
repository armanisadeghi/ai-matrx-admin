"use client";

import React, { useMemo } from "react";
import MathProblem from "@/features/math/components/MathProblem";
import { MathProblemProps } from "@/features/math/types";
import { normalizeMathProblemLatex } from "@/features/math/utils/latex-normalizer";

interface MathProblemBlockProps {
    problemData: {
        math_problem: Omit<MathProblemProps, "id">;
    };
}

const MathProblemBlock: React.FC<MathProblemBlockProps> = ({ problemData }) => {
    // Normalize LaTeX content to fix common AI mistakes (memoized to avoid re-processing)
    const normalizedProblemData = useMemo(
        () => normalizeMathProblemLatex(problemData.math_problem),
        [problemData]
    );

    // Extract the math_problem object and add a temporary id for rendering
    const problem: MathProblemProps = {
        id: "preview",
        ...normalizedProblemData,
    };

    return (
        <div className="w-full my-4">
            <MathProblem {...problem} />
        </div>
    );
};

export default MathProblemBlock;

