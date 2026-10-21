import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/memory", {
  title: "Memory",
  description: "Everything you and your agents remember: search it, organize it, and test it.",
  letter: "M",
});

export default function MemoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
