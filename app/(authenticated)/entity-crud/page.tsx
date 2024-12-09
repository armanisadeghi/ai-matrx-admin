// app/(authenticated)/entity-crud/page.tsx

import { EntityDirectory } from "@/components/matrx/Entity";


export default function EntityCrudPage() {
    return (
        <div className="container py-6">
            <h1 className="text-3xl font-bold mb-6">Entity Management</h1>
            <EntityDirectory />
        </div>
    );
}

