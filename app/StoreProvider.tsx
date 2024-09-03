// File: app/StoreProvider.tsx

'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/lib/redux/store';
import { SchemaProvider } from './SchemaProvider';
import { initialSchemas } from '@/lib/initialSchemas'; // You'll create this file

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const storeRef = useRef<AppStore>();
    if (!storeRef.current) {
        storeRef.current = makeStore();
    }

    return (
        <SchemaProvider initialSchemas={initialSchemas}>
            <Provider store={storeRef.current}>{children}</Provider>
        </SchemaProvider>
    );
}
