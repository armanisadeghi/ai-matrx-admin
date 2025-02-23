'use client';

import { useEffect, useState } from 'react';
import { useAppletRecipe, useBrokerComponents } from '@/hooks/run-recipe/useRunApps';

// Mock types/imports if not available in test environment
// Remove if not needed
type CompiledRecipeEntry = any;
type AppletRecordWithKey = any;
type CompiledRecipeRecordWithKey = any;

export default function Home() {
  return (
      <HookTester />
  );
}

function HookTester() {
  // Use a test applet ID
  const testAppletId = "976c56e5-263c-4815-b2ec-e6d1be04003a";
  const [renderCount, setRenderCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Monitor hook stability
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRenderCount(prev => prev + 1);
    }, 5000); // Update every 5 seconds to see if it causes re-renders/instability
    
    return () => clearInterval(intervalId);
  }, []);

  // Hook testing
  let hookResult = null;
  let hookError = null;
  
  try {
    hookResult = useAppletRecipe(testAppletId);
  } catch (e) {
    hookError = e instanceof Error ? e.message : String(e);
    if (!error) setError(hookError);
  }
  
  // Extract values from hook or use defaults if hook errors
  const {
    isLoading: isAppletLoading,
    compiledRecipe = null,
    selectedVersion = null,
    recipeRecordKey = '',
    neededBrokers = [],
    appletRecord = null,
  } = hookResult || {};

  const { brokerComponentMetadataMap, hasAllInputComponents, isLoading } = useBrokerComponents({ neededBrokers, isAppletLoading });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">useAppletRecipe Hook Tester</h1>
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded mb-4">
        <p>Render count: {renderCount}</p>
        <p>Test applet ID: {testAppletId}</p>
      </div>

      {error && (
        <div className="bg-red-100 p-4 rounded mb-4 border border-red-400">
          <h2 className="text-red-800 font-bold">Hook Error:</h2>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="Hook State">
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Recipe Key: {recipeRecordKey}</p>
          <p>Selected Version: {selectedVersion || 'None'}</p>
          <p>Needed Brokers: {neededBrokers.length}</p>
        </InfoCard>

        <InfoCard title="Recipe Data">
          {compiledRecipe ? (
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
              {JSON.stringify(compiledRecipe, null, 2)}
            </pre>
          ) : (
            <p>No recipe data available</p>
          )}
        </InfoCard>

        <InfoCard title="Applet Record">
          {appletRecord ? (
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
              {JSON.stringify(appletRecord, null, 2)}
            </pre>
          ) : (
            <p>No applet record available</p>
          )}
        </InfoCard>

        <InfoCard title="Hook Updates">
          <div className="space-y-2">
            <p>Monitoring re-renders...</p>
            <ul className="list-disc pl-5">
              <li>If multiple unnecessary re-renders occur, hook may be unstable</li>
              <li>Watch for changing values that shouldn't change</li>
              <li>Check for missing dependency arrays</li>
            </ul>
          </div>
        </InfoCard>
      </div>
    </main>
  );
}

// Helper component for consistent UI
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded shadow p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      <div className="text-sm">{children}</div>
    </div>
  );
}