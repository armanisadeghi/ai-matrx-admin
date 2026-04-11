import { SocketUser } from "@/components/socket/admin/SocketUser";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/socket-form-builder/user-concept", {
  title: "Component Demo Socket Form Builder User Concept",
  description: "Interactive demo: Component Demo Socket Form Builder User Concept. AI Matrx demo route.",
});

export default function Page() {
    return (
        <SocketUser className="w-full h-full" />
    );
}

