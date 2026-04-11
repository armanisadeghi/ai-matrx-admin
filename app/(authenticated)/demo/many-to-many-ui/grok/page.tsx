import RelationshipMaker from "./RelationshipMaker";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui/grok", {
  title: "Many To Many Ui Grok",
  description: "Interactive demo: Many To Many Ui Grok. AI Matrx demo route.",
});

export default function Page() {
  return (
    <div className="w-full h-full">
      <RelationshipMaker />
    </div>
  );
}
