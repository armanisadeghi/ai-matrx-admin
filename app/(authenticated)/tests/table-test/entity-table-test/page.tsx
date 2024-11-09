// app/tests/table-test/entity-table-test/page.tsx
'use client';

import React from 'react';
import { EntityTable } from './EntityTable';

export default function EntityTableTestPage() {
    return (
        <div>
            <EntityTable entityKey="registeredFunction" />
        </div>
    );
}
