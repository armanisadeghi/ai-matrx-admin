// app/tests/table-test/entity-table-test/page.tsx
'use client';

import React from 'react';
import { EntityTable } from './EntityTable'; // Update this import path to match where your EntityTable component is located

export default function EntityTableTestPage() {
    return (
        <div>
            <h1>Entity Table Test</h1>
            <EntityTable entityKey="registeredFunction" />
        </div>
    );
}
