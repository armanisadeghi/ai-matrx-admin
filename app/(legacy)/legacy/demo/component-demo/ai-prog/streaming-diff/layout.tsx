import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Streaming Diff",
  title: "Demo",
  description: "Streaming diff AI programming demo.",
  letter: "SD", // Streaming Diff
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
