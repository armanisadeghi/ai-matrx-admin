// app/(authenticated)/tests/forms/page.tsx

import {NextNavCardFull} from "@/components/matrx/navigation";

const formPages = [
    {
        title: 'Dynamic Schema Selector Tests',
        path: 'dynamic-test',
        relative: true,
        description: 'The dynamic Schema selector tests - Will work for any selector that is not keyed'
    },
    {
        title: 'Entity Selector Tests',
        path: 'keyed-selectors',
        relative: true,
        description: 'Made a new one because keyed selectors have different needs.'
    },
    {
        title: 'Original Test',
        path: 'original-test',
        relative: true,
        description: 'The original one, which is similar, but some slight differences.'

    },
];

export default function FormsPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Selector Tests</h1>
            <NextNavCardFull items={formPages}/>
        </div>
    );
}
