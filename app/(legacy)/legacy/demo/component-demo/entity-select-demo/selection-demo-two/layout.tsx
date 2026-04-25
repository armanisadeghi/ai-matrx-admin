import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selection Demo Two",
  title: "Demo",
  description: "Second entity selection pattern demo.",
  letter: "E2", // Selection Demo Two
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
