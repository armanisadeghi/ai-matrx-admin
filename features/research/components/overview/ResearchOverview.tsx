import { PipelineGraph } from "./pipeline-graph/PipelineGraph";
import { TopicHeadline } from "./TopicHeadline";

/**
 * Thin host for the research topic overview. The PipelineGraph owns
 * the entire visual surface — control strip, animated pipeline graph,
 * active stage drawer, and last-run summary.
 *
 * Anything that used to live here (header pill, description, ActionBar,
 * PipelineCards, IterationControls) has either moved into the pipeline graph
 * or been replaced by it.
 */
export default function ResearchOverview() {
  return (
    <>
      <TopicHeadline />
      <PipelineGraph />
    </>
  );
}
