import React, { useState, useEffect, useCallback } from 'react';
import {
    getAllEditors,
    getFilteredChips,
    getBrokerContent,
    ChipSearchResult,
    FormattedBrokerContent
} from '../utils/chipFilnder'

interface GlobalState {
    editors: Array<{ id: string; label: string }>;
    chips: ChipSearchResult[];
    brokerIds: string[];
}

const ChipSearchUtility: React.FC = () => {
    // Global state
    const [globalState, setGlobalState] = useState<GlobalState>({
        editors: [],
        chips: [],
        brokerIds: []
    });

    // Selection state
    const [selectedEditor, setSelectedEditor] = useState<string>('all');
    const [selectedChipId, setSelectedChipId] = useState<string>('');
    const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
    const [manualId, setManualId] = useState<string>('');
    const [searchType, setSearchType] = useState<'chip' | 'broker'>('broker');

    // Content state
    const [brokerContent, setBrokerContent] = useState<FormattedBrokerContent | null>(null);

    const refreshGlobalState = useCallback(() => {
        const editors = getAllEditors();
        const allChips = getFilteredChips('all');
        const uniqueBrokerIds = Array.from(new Set(allChips.map(chip => chip.brokerId)));

        setGlobalState({
            editors,
            chips: allChips,
            brokerIds: uniqueBrokerIds
        });
    }, []);

    // Initialize and handle refresh
    useEffect(() => {
        refreshGlobalState();
    }, [refreshGlobalState]);

    // Handle editor selection
    const handleEditorChange = (editorId: string) => {
        setSelectedEditor(editorId);
        const filteredChips = getFilteredChips(editorId);
        setGlobalState(prev => ({
            ...prev,
            chips: filteredChips,
            brokerIds: Array.from(new Set(filteredChips.map(chip => chip.brokerId)))
        }));
    };

    // Handle content retrieval
    const handleGetContent = () => {
        if (!selectedBrokerId && !manualId) return;
        const brokerId = manualId || selectedBrokerId;
        const content = getBrokerContent(brokerId);
        setBrokerContent(content);
    };

    return (
        <div className="p-4 space-y-4 bg-textured rounded-lg border-border">
            {/* Header with Refresh */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chip Content Recovery</h2>
                <button
                    onClick={refreshGlobalState}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Refresh Data
                </button>
            </div>

            {/* Main Selection Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    {/* Editor Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Select Editor
                        </label>
                        <select
                            value={selectedEditor}
                            onChange={(e) => handleEditorChange(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-textured text-gray-900 dark:text-gray-100"
                        >
                            <option value="all">All Editors</option>
                            {globalState.editors.map(editor => (
                                <option key={editor.id} value={editor.id}>{editor.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Search By
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSearchType('broker')}
                                className={`flex-1 px-3 py-2 rounded ${
                                    searchType === 'broker' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Broker ID
                            </button>
                            <button
                                onClick={() => setSearchType('chip')}
                                className={`flex-1 px-3 py-2 rounded ${
                                    searchType === 'chip' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Chip ID
                            </button>
                        </div>
                    </div>

                    {/* ID Selection */}
                    {searchType === 'broker' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Select Broker ID
                            </label>
                            <select
                                value={selectedBrokerId}
                                onChange={(e) => setSelectedBrokerId(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-textured text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Select a Broker ID</option>
                                {globalState.brokerIds.map(id => (
                                    <option key={id} value={id}>{id}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Select Chip ID
                            </label>
                            <select
                                value={selectedChipId}
                                onChange={(e) => setSelectedChipId(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-textured text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Select a Chip ID</option>
                                {globalState.chips.map(chip => (
                                    <option key={chip.id} value={chip.id}>{chip.id}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Manual ID Entry */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Or Enter ID Manually
                        </label>
                        <input
                            type="text"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-textured text-gray-900 dark:text-gray-100"
                            placeholder={`Enter ${searchType === 'broker' ? 'broker' : 'chip'} ID`}
                        />
                    </div>

                    <button
                        onClick={handleGetContent}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                        Get Content
                    </button>
                </div>

                {/* Content Display */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Recovered Content
                    </label>
                    <textarea
                        value={brokerContent?.combinedContent || ''}
                        readOnly
                        className="w-full h-[calc(100%-2rem)] p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded bg-textured text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Metadata Display */}
            {brokerContent && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border-border">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Metadata</h3>
                    <pre className="text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                        {JSON.stringify(brokerContent.chips.map(chip => ({
                            chipId: chip.chipId,
                            editorId: chip.editorId
                        })), null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default ChipSearchUtility;