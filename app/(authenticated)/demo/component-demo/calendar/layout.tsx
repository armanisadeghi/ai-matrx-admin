import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Calendar",
  title: "Demo",
  description: "Calendar component demo.",
  letter: "Cd", // Calendar
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
