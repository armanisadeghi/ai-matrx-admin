import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Glass Effect",
  title: "Tests",
  description: "Glass morphism and blur effect tests",
  letter: "GE",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
