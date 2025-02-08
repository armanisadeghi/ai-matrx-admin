'use client';

import DynamicBrokerSection from '../components/DynamicBrokerSamplePage';

export default function Page() {
    return (
        <DynamicBrokerSection
            sectionTitle='Fixed Height with Scrolling'
            maxHeight='400px'
            cardClassName='bg-slate-50 dark:bg-slate-800'
            cardHeaderClassName='bg-slate-50 dark:bg-slate-800 min-h-12'
        />
    );
}
