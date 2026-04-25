import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Orbital",
  title: "Demo",
  description: "Orbital light switch demo.",
  letter: "LO", // LS Orbital
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
