'use client';

import DynamicBrokerSection from '../components/DynamicBrokerSamplePage';

export default function Page() {
    return (
        <DynamicBrokerSection
            sectionTitle='Custom Styled Section'
            sectionClassName='shadow-lg'
            cardClassName='border-2'
            cardTitleClassName='text-primary'
            cardContentClassName='bg-muted/50'
        />
    );
}
