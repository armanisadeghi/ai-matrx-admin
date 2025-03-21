// File: app/(authenticated)/chat/[id]/page.tsx

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;

    const conversationId = resolvedParams.id;

    return <></>;
}
