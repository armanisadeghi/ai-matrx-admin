// app/(authenticated)/tests/math/[id]/page.tsx

'use client';

import MathProblem from "../components/MathProblemG"
import { problemsData } from '../local-data/sample-data';
import {useParams} from "next/navigation";

export default function DynamicMathProblemPage() {
    const params = useParams();
    const problem = problemsData.find(p => p.id === params.id);

    if (!problem) {
        return <div>Problem not found</div>;
    }

    return (
        <div className="h-[calc(100vh-5rem)] flex flex-col">
            <MathProblem {...problem} />
        </div>
    );
}
