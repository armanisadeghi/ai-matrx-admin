// app/StoreProvider.tsx

'use client';

import {useRef, useEffect} from 'react';
import {Provider} from 'react-redux';
import {AppStore, makeStore} from '@/lib/redux/store';
import {loadPreferences} from '@/lib/redux/middleware/preferencesMiddleware';
import {InitialReduxState} from '@/types/reduxTypes';

export default function StoreProvider(
    {
        children,
        initialState,
    }: {
        children: React.ReactNode;
        initialState?: InitialReduxState;
    }) {
    const storeRef = useRef<AppStore>();
    if (!storeRef.current) {
        storeRef.current = makeStore(initialState);
    }

    useEffect(() => {
        if (storeRef.current) {
            storeRef.current.dispatch(loadPreferences());
        }
    }, []);


    return <Provider store={storeRef.current}>{children}</Provider>;
}
