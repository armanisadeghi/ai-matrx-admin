import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Select",
  title: "Demo",
  description: "Light switch select showcase demo.",
  letter: "SU", // LS Select
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
