import BrokerSectionOneColumn from "@/components/brokers/value-sections/BrokerSectionOneColumn";
import { mockData } from "@/components/brokers/constants/mock-data";



export default function Page() {
    return (
        <div className="h-full w-full bg-slate-200 dark:bg-slate-800 space-y-8 pt-8">
            <div className="container mx-auto px-4 max-w-2xl bg-background border border-gray-200 dark:border-gray-800 rounded-lg">
                <BrokerSectionOneColumn 
                brokers={mockData.brokers}
                inputComponents={mockData.inputComponents}
                sectionTitle='Enter the details' 
                />
            </div>
        </div>
    );
}