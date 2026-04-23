import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/image-studio", {
    titlePrefix: "Convert",
    title: "Image Studio",
    description:
        "Drop images in, pick presets, get every platform-perfect size out — with format, quality, and compression controls.",
    letter: "Ic",
});

export default function ConvertLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
