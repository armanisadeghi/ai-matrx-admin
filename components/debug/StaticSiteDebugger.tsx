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
            
            // Test the root with CORS to see what happens
            addResult('Testing with CORS mode...');
            try {
                const corsResponse = await fetch('https://mymatrx.com', { mode: 'cors' });
                addResult(`CORS fetch successful: ${corsResponse.status} ${corsResponse.statusText}`);
                addResult(`CORS headers: ${JSON.stringify([...corsResponse.headers.entries()])}`);
            } catch (corsError: any) {
                addResult(`CORS fetch failed: ${corsError.message}`);
            }
        } catch (error: any) {
            addResult(`Basic fetch failed: ${error.message}`);
        }
        
        setIsLoading(false);
    };

    const testAPIEndpoint = async () => {
        setIsLoading(true);
        addResult('=== API Endpoint Test ===');
        
        // Test multiple endpoint variations
        const endpoints = [
            '/api/test',
            '/api/test.js',
            '/test',
            '/api',
            '/.well-known/health'
        ];
        
        for (const endpoint of endpoints) {
            const url = `https://mymatrx.com${endpoint}`;
            addResult(`Testing endpoint: ${url}`);
            
            try {
                // Try with different fetch options
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    mode: 'cors'
                });
                
                addResult(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
                addResult(`   Headers: ${JSON.stringify([...response.headers.entries()])}`);
                
                if (response.ok) {
                    try {
                        const data = await response.text();
                        addResult(`   Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
                    } catch (parseError) {
                        addResult(`   Response parsing failed: ${parseError}`);
                    }
                }
            } catch (error: any) {
                addResult(`❌ ${endpoint}: ${error.message}`);
                
                // Try with no-cors mode as fallback
                try {
                    const noCorsResponse = await fetch(url, { mode: 'no-cors' });
                    addResult(`   No-CORS fallback: ${noCorsResponse.type} (${noCorsResponse.status || 'unknown status'})`);
                } catch (noCorsError: any) {
                    addResult(`   No-CORS fallback also failed: ${noCorsError.message}`);
                }
            }
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

    const testSiteStructure = async () => {
        setIsLoading(true);
        addResult('=== Site Structure Test ===');
        
        // Test common file locations to understand the site structure
        const testPaths = [
            '/',
            '/index.html',
            '/api',
            '/api/',
            '/pages',
            '/pages/',
            '/.vercel.json',
            '/vercel.json',
            '/package.json',
            '/_next',
            '/favicon.ico'
        ];
        
        for (const path of testPaths) {
            const url = `https://mymatrx.com${path}`;
            
            try {
                const response = await fetch(url, { 
                    method: 'HEAD', // Use HEAD to avoid downloading content
                    mode: 'cors'
                });
                
                addResult(`✅ ${path}: ${response.status} ${response.statusText}`);
                if (response.headers.get('content-type')) {
                    addResult(`   Content-Type: ${response.headers.get('content-type')}`);
                }
            } catch (error: any) {
                addResult(`❌ ${path}: ${error.message}`);
            }
        }
        
        setIsLoading(false);
    };

    const testWithDifferentMethods = async () => {
        setIsLoading(true);
        addResult('=== HTTP Methods Test ===');
        
        const methods = ['GET', 'POST', 'OPTIONS'];
        const testUrl = 'https://mymatrx.com/api/test';
        
        for (const method of methods) {
            addResult(`Testing ${method} ${testUrl}`);
            
            try {
                const options: RequestInit = {
                    method,
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                };
                
                if (method === 'POST') {
                    options.body = JSON.stringify({ test: true });
                }
                
                const response = await fetch(testUrl, options);
                addResult(`✅ ${method}: ${response.status} ${response.statusText}`);
                
                // Log CORS headers specifically
                const corsHeaders = [
                    'access-control-allow-origin',
                    'access-control-allow-methods', 
                    'access-control-allow-headers',
                    'access-control-allow-credentials'
                ];
                
                corsHeaders.forEach(header => {
                    const value = response.headers.get(header);
                    if (value) {
                        addResult(`   ${header}: ${value}`);
                    }
                });
                
            } catch (error: any) {
                addResult(`❌ ${method}: ${error.message}`);
            }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                        onClick={testEnvironmentVariables}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                        Test Environment Variables
                    </button>
                    
                    <button
                        onClick={testBasicFetch}
                        disabled={isLoading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                        Test Basic Connectivity
                    </button>
                    
                    <button
                        onClick={testSiteStructure}
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                        Test Site Structure
                    </button>
                    
                    <button
                        onClick={testAPIEndpoint}
                        disabled={isLoading}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                        Test API Endpoints
                    </button>
                    
                    <button
                        onClick={testWithDifferentMethods}
                        disabled={isLoading}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                        Test HTTP Methods
                    </button>
                    
                    <button
                        onClick={testDeployment}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                        Test Deployment
                    </button>
                    
                    <button
                        onClick={clearResults}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
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
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Comprehensive Diagnostics Available:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                        <h5 className="font-medium mb-2">Environment & Setup:</h5>
                        <ul className="space-y-1">
                            <li>• Environment variables validation</li>
                            <li>• Basic site connectivity</li>
                            <li>• CORS policy testing</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-medium mb-2">API & Structure:</h5>
                        <ul className="space-y-1">
                            <li>• Multiple endpoint variations</li>
                            <li>• HTTP methods testing</li>
                            <li>• Site structure analysis</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Recommendation:</strong> Run tests in this order: Environment Variables → Basic Connectivity → Site Structure → API Endpoints → HTTP Methods
                    </p>
                </div>
            </div>
        </div>
    );
}
