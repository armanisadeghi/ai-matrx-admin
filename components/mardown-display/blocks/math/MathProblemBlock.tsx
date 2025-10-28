"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, Database } from "lucide-react";
import MathProblem from "@/features/math/components/MathProblem";
import { MathProblemProps } from "@/features/math/types";
import { normalizeMathProblemLatex } from "@/features/math/utils/latex-normalizer";
import { downloadMathProblem, uploadMathProblem } from "@/features/math/utils/math-problem-persistence";
import ContentBlockWrapper from "../common/ContentBlockWrapper";

interface MathProblemBlockProps {
    problemData: {
        math_problem: Omit<MathProblemProps, "id">;
    };
}

const MathProblemBlock: React.FC<MathProblemBlockProps> = ({ problemData: initialProblemData }) => {
    // State to handle uploaded problems
    const [problemData, setProblemData] = useState(initialProblemData);
    
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
    
    // Download handler
    const handleDownload = () => {
        downloadMathProblem(problemData.math_problem);
    };
    
    // Upload handler
    const handleUpload = async () => {
        const uploadedProblem = await uploadMathProblem();
        setProblemData({ math_problem: uploadedProblem });
    };
    
    // Custom action: View in database (future feature)
    const customActions = [
        {
            icon: Database,
            tooltip: "Save to database (coming soon)",
            onClick: () => {
                alert("Database integration coming soon! For now, you can download the problem and manually import it.");
            },
            className: "bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-700"
        }
    ];

    return (
        <ContentBlockWrapper
            title={problem.title}
            subtitle={`${problem.topic_name} • ${problem.module_name}`}
            enableCanvas={true}
            canvasType="math_problem"
            canvasData={problemData}
            canvasMetadata={{
                title: problem.title,
                course: problem.course_name,
                topic: problem.topic_name,
                module: problem.module_name
            }}
            onDownload={handleDownload}
            onUpload={handleUpload}
            customActions={customActions}
            allowFullscreen={true}
            className="my-4"
            contentClassName="max-w-4xl mx-auto"
        >
            <MathProblem {...problem} />
        </ContentBlockWrapper>
    );
};

export default MathProblemBlock;

