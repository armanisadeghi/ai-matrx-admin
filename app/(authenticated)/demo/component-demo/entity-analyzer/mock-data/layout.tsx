import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Analyzer Mock Data",
  title: "Demo",
  description: "Entity analyzer mock data demo.",
  letter: "Em", // Analyzer Mock Data
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
