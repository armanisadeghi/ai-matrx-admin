// app/(dashboard)/entity-management/page.tsx
import {Metadata} from 'next';
import EntityPageClient from './EntityPageClient';

export const metadata: Metadata = {
    title: 'Entity Management 2',
    description: 'Manage and edit entities with dynamic layout controls',
};

export default async function EntityManagementPage() {
    return <EntityPageClient />;
}
