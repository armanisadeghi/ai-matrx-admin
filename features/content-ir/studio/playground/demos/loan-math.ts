import type { PlaygroundDemo } from "../types";

/** react-katex formulas from data. */
const source = String.raw`import { Sigma } from "lucide-react";
import { BlockMath, InlineMath } from "react-katex";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";

export default function LoanMath({ data }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const steps = streamList(data?.steps).filter((step) => step && typeof step.tex === "string");
  if (!arrived && steps.length === 0) return <StreamingSkeleton layout="text" rows={4} />;
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={title || "Worked math"}
        icon={Sigma}
        stats={[{ label: "steps", value: steps.length }]}
        copy={{ label: "Loan math", human: () => steps.map((s) => streamText(s.label, "") + ": " + s.tex).join("\n"), json: () => data }}
      />
      <KindPanelGrid minColumnWidth={280} gap="sm">
        {steps.map((step, index) => (
          <KindPanel key={index} title={streamText(step.label, "Step " + (index + 1))} icon={Sigma}>
            <div className="overflow-x-auto text-foreground">
              <BlockMath math={step.tex} />
            </div>
            {step.note ? (
              <p className="text-xs text-muted-foreground">
                {step.note} {step.inline ? <InlineMath math={step.inline} /> : null}
              </p>
            ) : null}
          </KindPanel>
        ))}
      </KindPanelGrid>
    </div>
  );
}
`;

export const LOAN_MATH_DEMO: PlaygroundDemo = {
  slug: "playground_loan_math",
  title: "Loan math",
  covers: ["react-katex"],
  source,
  sample: {
    title: "Monthly payment on a $24,000 car loan",
    steps: [
      { label: "Payment formula", tex: "M = P \\frac{r(1+r)^n}{(1+r)^n - 1}", note: "Monthly rate", inline: "r = 0.069 / 12" },
      { label: "Plug in", tex: "M = 24000 \\cdot \\frac{0.00575(1.00575)^{60}}{(1.00575)^{60} - 1}" },
      { label: "Result", tex: "M \\approx 474.10", note: "Total interest", inline: "60M - P \\approx 4446" },
    ],
  },
};
