// app/(authenticated)/tests/slack/with-brokers/page.tsx

'use client';

import { BrokerSlackClient } from './components/BrokerSlackClient';
import { SlackAuthentication } from './components/SlackAuthentication';
import { ChannelSelector } from './components/ChannelSelector';
import { BrokerFileUploader } from './components/BrokerFileUploader';
import { BrokerFormExample } from './components/BrokerForm';

export default function SlackWithBrokersPage() {
    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-950">
            <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">
                Slack Integration with Brokers
            </h1>
            
            <BrokerSlackClient>
                {/* Authentication component that provides the Slack connection UI */}
                <SlackAuthentication />
                
                {/* Channel selector appears only when authenticated */}
                <ChannelSelector />
                
                {/* File uploader that will use the authenticated token */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
                        <BrokerFileUploader />
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
                        <BrokerFormExample />
                    </div>
                </div>
            </BrokerSlackClient>
        </div>
    );
}
