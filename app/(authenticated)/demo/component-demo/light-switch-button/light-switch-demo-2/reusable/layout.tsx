import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Demo 2 Reusable",
  title: "Demo",
  description: "Reusable light switch demo 2.",
  letter: "WR", // LS Demo 2 Reusable
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
