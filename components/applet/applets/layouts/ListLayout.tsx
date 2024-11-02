import { AppletConfig } from "@/types/applets/applet-config";

// components/applet/applets/layouts/ListLayout.tsx
export function ListLayout({ config }: { config: AppletConfig }) {
    return (
        <div className="container py-8">
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p>List layout coming soon...</p>
        </div>
    );
}
