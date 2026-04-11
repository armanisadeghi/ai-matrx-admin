import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Selects",
  title: "Demo",
  description: "Select components overview demo.",
  letter: "Se", // Selects
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
