// app/StoreProvider.tsx

'use client';

import {useRef, useEffect} from 'react';
import {Provider} from 'react-redux';
import {AppStore, makeStore} from '@/lib/redux/store';
import {loadPreferences} from '@/lib/redux/middleware/preferencesMiddleware';
import {InitialReduxState} from '@/types/reduxTypes';
import {EntityRelationshipManager} from '@/utils/schema/relationshipUtils';

export default function StoreProvider(
    {
        children,
        initialState,
    }: {
        children: React.ReactNode;
        initialState?: InitialReduxState;
    }) {
    const storeRef = useRef<AppStore | null>(null);

    if (!storeRef.current) {
        storeRef.current = makeStore(initialState);
        EntityRelationshipManager.getInstance(initialState?.globalCache);
    }

    useEffect(() => {
        if (storeRef.current) {
            storeRef.current.dispatch(loadPreferences());
        }
    }, []);

    if (!storeRef.current) {
        throw new Error('Redux store failed to initialize');
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
}