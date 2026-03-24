'use client';

import { EntityPack } from '@/providers/packs/EntityPack';

export default function EntitiesLayout({ children }: { children: React.ReactNode }) {
    return <EntityPack>{children}</EntityPack>;
}
