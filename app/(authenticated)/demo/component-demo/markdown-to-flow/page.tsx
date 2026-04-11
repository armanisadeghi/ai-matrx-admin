
import MarkdownFlowDiagramConverter from "@/components/mardown-display/new/MarkdownFlowDiagramConverter";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/markdown-to-flow", {
  title: "Component Demo Markdown To Flow",
  description: "Interactive demo: Component Demo Markdown To Flow. AI Matrx demo route.",
});

export default function Page() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            <MarkdownFlowDiagramConverter />
        </div>
    )
}
