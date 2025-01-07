import React, { useState, useCallback } from 'react';
import { analyzeChipDistribution, findChipById, findChipByIdGlobal, findChipsByBrokerId, findChipsByBrokerIdGlobal, getAllChipsGlobal, getAllChipsInEditor, getChipCount, getUniqueBrokerIds, recoverChipContent } from '../utils/chipFilnder';

interface SearchResult {
    type: 'chip' | 'broker' | 'analysis';
    scope: 'editor' | 'global';
    data: any;
    timestamp: string;
}

const ChipSearchUtility: React.FC<{ editorId: string }> = ({ editorId }) => {
    const [chipId, setChipId] = useState('');
    const [brokerId, setBrokerId] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const getEditor = useCallback(() => {
        const editor = document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement;
        if (!editor) {
            throw new Error(`Editor with ID ${editorId} not found`);
        }
        return editor;
    }, [editorId]);

    const addSearchResult = useCallback((result: Omit<SearchResult, 'timestamp'>) => {
        setSearchResults(prev => [{
            ...result,
            timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 10));
    }, []);

    // Utility functions
    const handleChipSearch = useCallback(async (scope: 'editor' | 'global') => {
        try {
            if (!chipId.trim()) {
                throw new Error('Please enter a chip ID');
            }

            const result = scope === 'editor'
                ? findChipById(getEditor(), chipId)
                : findChipByIdGlobal(chipId);

            addSearchResult({
                type: 'chip',
                scope,
                data: result
            });
        } catch (error) {
            addSearchResult({
                type: 'chip',
                scope,
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }, [chipId, getEditor, addSearchResult]);

    const handleBrokerSearch = useCallback(async (scope: 'editor' | 'global') => {
        try {
            if (!brokerId.trim()) {
                throw new Error('Please enter a broker ID');
            }

            const results = scope === 'editor'
                ? findChipsByBrokerId(getEditor(), brokerId)
                : findChipsByBrokerIdGlobal(brokerId);

            addSearchResult({
                type: 'broker',
                scope,
                data: results
            });
        } catch (error) {
            addSearchResult({
                type: 'broker',
                scope,
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }, [brokerId, getEditor, addSearchResult]);

    const handleAnalysis = useCallback((analysisType: string) => {
        try {
            let result;
            switch (analysisType) {
                case 'uniqueBrokers':
                    result = getUniqueBrokerIds();
                    break;
                case 'chipCount':
                    result = getChipCount();
                    break;
                case 'distribution':
                    result = analyzeChipDistribution();
                    break;
                case 'recover':
                    if (!chipId.trim()) {
                        throw new Error('Please enter a chip ID to recover content');
                    }
                    result = recoverChipContent(chipId);
                    break;
                default:
                    throw new Error('Unknown analysis type');
            }

            addSearchResult({
                type: 'analysis',
                scope: 'global',
                data: result
            });
        } catch (error) {
            addSearchResult({
                type: 'analysis',
                scope: 'global',
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }, [chipId, addSearchResult]);

    return (
        <div className="mt-8 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Chip Search Utility</h2>
            
            <div className="space-y-6">
                {/* Chip ID Search */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Search by Chip ID
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chipId}
                            onChange={e => setChipId(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Enter chip ID"
                        />
                        <button
                            onClick={() => handleChipSearch('editor')}
                            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Search Editor
                        </button>
                        <button
                            onClick={() => handleChipSearch('global')}
                            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                            Search Global
                        </button>
                    </div>
                </div>

                {/* Broker ID Search */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Search by Broker ID
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={brokerId}
                            onChange={e => setBrokerId(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="Enter broker ID"
                        />
                        <button
                            onClick={() => handleBrokerSearch('editor')}
                            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Search Editor
                        </button>
                        <button
                            onClick={() => handleBrokerSearch('global')}
                            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                            Search Global
                        </button>
                    </div>
                </div>
                {/* List All Chips */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium">
                        List All Chips
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const results = getAllChipsInEditor(getEditor());
                                addSearchResult({
                                    type: 'chip',
                                    scope: 'editor',
                                    data: results
                                });
                            }}
                            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            List Editor Chips
                        </button>
                        <button
                            onClick={() => {
                                const results = getAllChipsGlobal();
                                addSearchResult({
                                    type: 'chip',
                                    scope: 'global',
                                    data: results
                                });
                            }}
                            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            List All Page Chips
                        </button>
                    </div>
                </div>



                {/* Analysis Tools */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Analysis Tools
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleAnalysis('uniqueBrokers')}
                            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        >
                            List Unique Brokers
                        </button>
                        <button
                            onClick={() => handleAnalysis('chipCount')}
                            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        >
                            Get Chip Count
                        </button>
                        <button
                            onClick={() => handleAnalysis('distribution')}
                            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        >
                            Analyze Distribution
                        </button>
                        <button
                            onClick={() => handleAnalysis('recover')}
                            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        >
                            Recover Content
                        </button>
                    </div>
                </div>

                {/* Results Display */}
                <div className="mt-4">
                    <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-gray-100">Search Results</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {searchResults.map((result, index) => (
                            <div 
                                key={index}
                                className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    <span>
                                        {result.type === 'analysis' ? 'Analysis' : 
                                         result.type === 'chip' ? 'Chip Search' : 'Broker Search'} 
                                        {result.type !== 'analysis' && ` - ${result.scope === 'editor' ? 'Editor Scope' : 'Global Scope'}`}
                                    </span>
                                    <span>{result.timestamp}</span>
                                </div>
                                <pre className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChipSearchUtility;
