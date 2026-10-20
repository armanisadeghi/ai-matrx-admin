"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import MathProblem from "@/features/math/components/MathProblem";
import { MathProblemProps } from "@/features/math/types";
import { normalizeMathProblemLatex } from "@/features/math/utils/latex-normalizer";
import { downloadMathProblem, uploadMathProblem } from "@/features/math/utils/math-problem-persistence";
import ContentBlockWrapper from "@ai-matrx/rich-content/display/blocks/common/ContentBlockWrapper";
import { mathPrinter } from "./math-printer";
import { PrintOptionsDialog, usePrintOptions } from "@ai-matrx/print/react";
import {
    BlockControlsButton,
    type BlockControlsHandle,
} from "@ai-matrx/rich-content/display/block-controls/BlockControls";

interface MathProblemBlockProps {
    problemData: {
        math_problem: Omit<MathProblemProps, "id">;
    };
    artifactId?: string;
    /** Block Controls for the problem (null/absent = this surface cannot save: no controls). */
    controls?: BlockControlsHandle | null;
}

/** "Topic • Module" from the parts that are there — never "undefined • undefined" (review 2 N2). */
export function mathSubtitle(problem: Pick<MathProblemProps, "topic_name" | "module_name">): string {
    return [problem.topic_name, problem.module_name]
        .filter((part): part is string => typeof part === "string" && part.trim() !== "" && part !== "undefined")
        .join(" • ");
}

const MathProblemBlock: React.FC<MathProblemBlockProps> = ({ problemData: initialProblemData, artifactId, controls = null }) => {
    // State to handle uploaded problems
    const [problemData, setProblemData] = useState(initialProblemData);
    // The problem's source changed (an edit through the controls, or a new version): show it.
    useEffect(() => {
        setProblemData(initialProblemData);
    }, [initialProblemData]);
    
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
    
    // Print integration
    const { open: printOpen, setOpen: setPrintOpen, triggerPrint } = usePrintOptions(mathPrinter, problemData);

    // Custom actions: Print. (The save-to-database stub is gone: a screen is honest
    // or absent — the promise stays tracked in lib/coming-soon until it is built.)
    const customActions = [
        {
            icon: Printer,
            tooltip: "Print math problem",
            onClick: triggerPrint,
        },
    ];

    return (
        <>
        <ContentBlockWrapper
            title={problem.title}
            subtitle={mathSubtitle(problem)}
            enableCanvas={true}
            canvasType="math_problem"
            canvasData={problemData}
            canvasMetadata={{
                title: problem.title,
                artifactId,
            }}
            onDownload={handleDownload}
            onUpload={handleUpload}
            customActions={customActions}
            allowFullscreen={true}
            headerContent={<BlockControlsButton controls={controls} title="Math problem controls" />}
            contentClassName="max-w-4xl mx-auto"
        >
            <MathProblem {...problem} />
        </ContentBlockWrapper>
        <PrintOptionsDialog
            printer={mathPrinter}
            data={problemData}
            open={printOpen}
            onOpenChange={setPrintOpen}
        />
        </>
    );
};

export default MathProblemBlock;
