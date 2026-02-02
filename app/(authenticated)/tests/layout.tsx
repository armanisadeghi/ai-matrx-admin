// Force dynamic rendering for all test pages to avoid build timeouts
export const dynamic = 'force-dynamic';

export default function TestsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
