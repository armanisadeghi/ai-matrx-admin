import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Function Decl Editor",
  title: "Demo",
  description: "JSON function declaration editor demo.",
  letter: "FD", // Function Decl Editor
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
