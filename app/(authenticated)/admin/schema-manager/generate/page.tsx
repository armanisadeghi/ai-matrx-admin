'use client';
import { useState } from 'react';
import { fetchAndGenerateSchema } from '@/app/actions/schemaGenerator';

export default function SchemaManagerPage() {
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateSchema = async () => {
        setLoading(true);
        try {
            // Directly invoke the Server Action
            const result = await fetchAndGenerateSchema();
            setResponse(result);
        } catch (err) {
            setResponse({ success: false, error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Schema Manager</h1>
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleGenerateSchema}
                disabled={loading}
            >
                {loading ? 'Generating...' : 'Generate Schema'}
            </button>

            {response && (
                <div className="mt-6">
                    {response.success ? (
                        <div>
                            <h2 className="text-xl font-semibold">Schema Generated Successfully</h2>
                            <pre className="p-4 rounded mt-2">
                                {JSON.stringify(response.schema, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-red-500">Error: {response.error}</div>
                    )}
                </div>
            )}
        </div>
    );
}
