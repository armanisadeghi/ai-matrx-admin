'use client';


import { RELATIONSHIP_DEFINITIONS } from '@/app/entities/hooks/relationships/relationshipDefinitions';
import MatrxCockpitPage from '@/components/playground/layout/MatrxCockpitPage';

export default function page() {
    const definitions = RELATIONSHIP_DEFINITIONS
    return <MatrxCockpitPage />;
}
