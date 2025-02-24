'use client';

import { ConfigBuilder } from "@/components/ui";
import { Inter } from 'next/font/google';

const inter = Inter({ 
    subsets: ['latin'],
    weight: ['200', '300', '400', '500'],
    display: 'swap',
});

export default function Page() {

    const testConfig = {
        
    }

    const handleConfigChange = (config: any) => {
        console.log(config);
    }

    return (
        <div className={`w-full h-full flex flex-col gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${inter.className} text-[11px] font-extralight tracking-tight antialiased`}>
            <h1 className="text-base font-light tracking-wide p-4">Config Builder</h1>
            <div className="max-w-4xl p-2">
                <ConfigBuilder 
                    initialConfig={testConfig} 
                    onConfigChange={handleConfigChange} 
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
            </div>
        </div>
    );
};