import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Dynamic Entity",
  title: "Tests",
  description: "Dynamic entity rendering and data binding tests",
  letter: "DE",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
