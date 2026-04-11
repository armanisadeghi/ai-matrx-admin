import RelationshipMaker from "./RelationshipMaker";

// TODO: Integrate into the system and apply it to other areas that have relationships

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui/claude", {
  title: "Many To Many Ui Claude",
  description: "Interactive demo: Many To Many Ui Claude. AI Matrx demo route.",
});

export default function Page() {
  return (
    <div className="w-full h-full">
      <RelationshipMaker />
    </div>
  );
}

