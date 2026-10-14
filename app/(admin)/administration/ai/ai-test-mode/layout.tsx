import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "AI Test Mode",
  title: "Admin",
  description: "Saved AI answers for test sessions: baselines, stand-ins, spend saved",
  letter: "TM",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
