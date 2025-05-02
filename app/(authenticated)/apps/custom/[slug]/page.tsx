// app/(authenticated)/apps/[slug]/page.tsx
import AppRendered from "../../AppRendererTest";

type Params = Promise<{ slug: string }>;

export default async function Page({ params }: { params: Params }) {
    const { slug } = await params; // Await the params Promise
    return (
        <div>
            <AppRendered slug={slug} />
        </div>
    );
}
