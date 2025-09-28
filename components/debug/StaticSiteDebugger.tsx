"use client";

import React, { useState } from 'react';
import { StaticSiteAPI } from '@/utils/staticSiteAPI';

export default function StaticSiteDebugger() {
    const [results, setResults] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const addResult = (message: string) => {
        setResults(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + message);
    };

    const testEnvironmentVariables = () => {
        addResult('=== Environment Variables Test ===');
        const apiKey = process.env.NEXT_PUBLIC_DEPLOY_API_KEY;
        const siteUrl = process.env.NEXT_PUBLIC_STATIC_SITE_URL;
        
        addResult(`NEXT_PUBLIC_DEPLOY_API_KEY: ${apiKey ? 'Set (' + apiKey.substring(0, 8) + '...)' : 'NOT SET'}`);
        addResult(`NEXT_PUBLIC_STATIC_SITE_URL: ${siteUrl || 'Using default (https://mymatrx.com)'}`);
    };

    const testBasicFetch = async () => {
        setIsLoading(true);
        addResult('=== Basic Fetch Test ===');
        
        try {
            addResult('Testing basic fetch to https://mymatrx.com...');
            const response = await fetch('https://mymatrx.com', { mode: 'no-cors' });
            addResult(`Basic fetch result: ${response.type} (this is expected for no-cors)`);
        } catch (error: any) {
            addResult(`Basic fetch failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const testAPIEndpoint = async () => {
        setIsLoading(true);
        addResult('=== API Endpoint Test ===');
        
        try {
            addResult('Testing /api/test endpoint...');
            const result = await StaticSiteAPI.testConnection();
            addResult(`API test successful: ${JSON.stringify(result)}`);
        } catch (error: any) {
            addResult(`API test failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const testDeployment = async () => {
        setIsLoading(true);
        addResult('=== Deployment Test ===');
        
        try {
            const testHTML = '<html><body><h1>Test Page</h1><p>This is a test deployment.</p></body></html>';
            addResult('Attempting test deployment...');
            const result = await StaticSiteAPI.deployPage(testHTML, 'Debug Test Page', 'Test deployment from debugger');
            addResult(`Deployment successful: ${JSON.stringify(result)}`);
        } catch (error: any) {
            addResult(`Deployment failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const clearResults = () => {
        setResults('');
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                Static Site Deployment Debugger
            </h2>
            
            <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={testEnvironmentVariables}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Test Environment Variables
                    </button>
                    
                    <button
                        onClick={testBasicFetch}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Test Basic Connectivity
                    </button>
                    
                    <button
                        onClick={testAPIEndpoint}
                        disabled={isLoading}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Test API Endpoint
                    </button>
                    
                    <button
                        onClick={testDeployment}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Test Deployment
                    </button>
                    
                    <button
                        onClick={clearResults}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        Clear Results
                    </button>
                </div>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    Debug Results:
                </h3>
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                    {results || 'No tests run yet. Click a button above to start debugging.'}
                </pre>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Quick Setup Checklist:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>✓ Create .env.local file in your project root</li>
                    <li>✓ Add NEXT_PUBLIC_DEPLOY_API_KEY=your-api-key</li>
                    <li>✓ Ensure your static site is deployed and accessible</li>
                    <li>✓ Verify /api/test and /api/deploy-page endpoints exist</li>
                    <li>✓ Check CORS configuration on your static site</li>
                </ul>
            </div>
        </div>
    );
}
