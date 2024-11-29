'use client';

import { Card } from '@/components/ui/card';
import EntityBrowserContent from './EntityBrowserContent';
import { getReducers, getActions } from '@/lib/redux/entity/utils/byname';

export default function EntityBrowserPage() {

    const reducers = getReducers();
    const actions = getActions();

    return (
        <Card>
            <EntityBrowserContent />
        </Card>
    );
}
