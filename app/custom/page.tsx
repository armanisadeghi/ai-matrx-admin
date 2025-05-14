// app/(authenticated)/apps/[slug]/page.tsx

type Params = Promise<{ slug: string }>;

export default async function Page({ params }: { params: Params }) {
    const { slug } = await params; // Await the params Promise
    return (
        <div>
            <AppRendered slug={slug} />
        </div>
    );
}
