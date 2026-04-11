import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/json-again/function-declaration-editor", {
  title: "Component Demo Json Again Function Declaration Editor",
  description: "Interactive demo: Component Demo Json Again Function Declaration Editor. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
