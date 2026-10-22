// /visual-maps/lab/[sampleId] — one sample: picture, screenshots, numbers, documents, rounds, send to agent.
import { SampleRecordPage } from "@/features/visual-map-lab/SampleRecordPage";

export default async function VisualMapLabSamplePage({ params }: { params: Promise<{ sampleId: string }> }) {
  const { sampleId } = await params;
  return <SampleRecordPage sampleId={decodeURIComponent(sampleId)} />;
}
