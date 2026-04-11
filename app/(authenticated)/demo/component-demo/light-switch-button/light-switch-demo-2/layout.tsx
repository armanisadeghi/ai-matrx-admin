import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Demo 2",
  title: "Demo",
  description: "Light switch demo 2.",
  letter: "W2", // LS Demo 2
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
