import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "AI Prog",
  title: "Demo",
  description: "AI programming and code editor experiments.",
  letter: "Ax", // AI Prog index
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
