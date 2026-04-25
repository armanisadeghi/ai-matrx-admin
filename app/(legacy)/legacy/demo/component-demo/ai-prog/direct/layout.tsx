import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "AI Prog Direct",
  title: "Demo",
  description: "Direct AI programming demo.",
  letter: "Dr", // AI Prog Direct
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
