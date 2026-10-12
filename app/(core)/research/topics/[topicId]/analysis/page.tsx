import AnalysisList from '@/features/research/components/analysis/AnalysisList';
import { readLayoutCookie } from '@/features/resizable-panels/readLayoutCookie';

export default async function AnalysisPage() {
    const defaultLayout = await readLayoutCookie('panels:research-analysis-reader');
    return <AnalysisList defaultLayout={defaultLayout} />;
}
