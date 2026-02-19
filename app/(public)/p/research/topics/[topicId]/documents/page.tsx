import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ topicId: string }>;
}

export default async function DocumentsRedirect({ params }: Props) {
    const { topicId } = await params;
    redirect(`/p/research/topics/${topicId}/document`);
}
