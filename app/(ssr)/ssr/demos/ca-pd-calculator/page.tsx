import { createRouteMetadata } from "@/utils/route-metadata";
import { CaPdCalculatorClient } from "./CaPdCalculatorClient";

export const metadata = createRouteMetadata("/ssr/demos/ca-pd-calculator", {
  titlePrefix: "CA PD Calculator",
  title: "Demo",
  description:
    "California Workers' Compensation Permanent Disability calculator suite — present value, weeks, life expectancy, PPD, and average weekly compensation.",
  letter: "PD",
});

export default function CaPdCalculatorPage() {
  return <CaPdCalculatorClient />;
}
