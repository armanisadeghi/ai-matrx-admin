import DynamicBrokerSampleThree from '../components/DynamicBrokerSampleThree';

export default function Page() {
    return (
        <div className='h-full w-full bg-slate-200 dark:bg-slate-800 space-y-8 pt-8'>
            <div className='container mx-auto px-4 max-w-2xl bg-background border border-gray-200 dark:border-gray-800 rounded-lg'>
                <DynamicBrokerSampleThree
                    sectionTitle='Enter the details'
                    cardContentClassName='grid gap-6 pb-8 lg:grid-cols-1' // or lg:grid-cols-3 for three columns, etc.
                />
            </div>
        </div>
    );
}
