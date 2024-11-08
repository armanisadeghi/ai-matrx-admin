// app/(authenticated)/tests/forms/page.tsx

import {NextNavCardFull} from "@/components/matrx/navigation";

const formPages = [
    {
        title: 'Animated Form Page',
        path: 'animated-form-page',
        relative: true,
        description: 'Appears to be the latest implementation'
    },
    {
        title: 'Animated Modal Tabs',
        path: 'animated-modal-tabs',
        relative: true,
        description: 'Modal with tabs and a form in each tab. Connected to Redux'
    },
    {
        title: 'Animated Form Page Alt',
        path: 'animated-form-page-alt',
        relative: true,
        description: 'Includes Layout options, but not the latest implementation'

    },
    {
        title: 'Animated Form',
        path: 'animated-form',
        relative: true,
        description: 'Very basic form using a small amount of local data'
    },
    {
        title: 'Animated Form Modal',
        path: 'animated-form-modal',
        relative: true,
        description: 'Modal with both single page and Multi-Step form options'
    },
    {
        title: 'Raw Form',
        path: 'raw',
        relative: true,
        description: 'Latest Implementation - Simple single-form direct, with Redux'
    },
    {
        title: 'Entity Form (Attempt)',
        path: 'entity-form',
        relative: true,
        description: 'Latest Implementation - Simple single-form direct, with Redux'
    },
];

export default function FormsPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Form Examples</h1>
            <NextNavCardFull items={formPages}/>
        </div>
    );
}
