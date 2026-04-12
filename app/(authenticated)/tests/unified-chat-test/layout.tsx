import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Unified Chat",
  title: "Tests",
  description: "Unified chat interface tests",
  letter: "UC",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
