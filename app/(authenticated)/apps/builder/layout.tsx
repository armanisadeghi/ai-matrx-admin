// Force dynamic rendering for all builder pages to avoid build timeouts
export const dynamic = 'force-dynamic';

export default function BuilderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
