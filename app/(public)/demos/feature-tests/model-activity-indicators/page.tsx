import type { Metadata } from "next";
import { ModelActivityIndicatorsDemo } from "./ModelActivityIndicatorsDemo";

export const metadata: Metadata = {
  title: "Model activity indicators",
  description:
    "Interactive demo of agent planning, status, loaders, and reasoning visuals.",
};

export default function ModelActivityIndicatorsPage() {
  return <ModelActivityIndicatorsDemo />;
}
