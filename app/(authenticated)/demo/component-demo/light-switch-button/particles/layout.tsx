import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Particles",
  title: "Demo",
  description: "Particle light switch demo.",
  letter: "LP", // LS Particles
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
