// app/(authenticated)/tests/slack/with-brokers/page.tsx

import { BrokerFormExample } from "./components/BrokerForm";
import { SlackUploader } from "./components/SlackUploader";
import { BrokerSlackManager } from "./components/BrokerSlackManager";

export default function SlackWithBrokersPage() {
    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <h1 className="text-2xl font-bold mb-8 text-slate-900 dark:text-slate-100">Slack Integration</h1>
            
            <div className="grid grid-cols-1 gap-8">
                {/* The broker registration happens in layout.tsx */}
                <BrokerSlackManager />
                
                <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                    <h3 className="font-semibold mb-2">About this integration:</h3>
                    <p className="mb-2">This Slack integration uses our broker system to manage state between components and persist data on the server.</p>
                    <p>User tokens are saved in localStorage for demonstration purposes only.</p>
                </div>
            </div>
        </div>
    );
}
