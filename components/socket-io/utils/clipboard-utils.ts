/**
 * Utility functions for clipboard operations
 */

/**
 * Copy data to clipboard as formatted JSON
 * @param data The data to copy to clipboard
 * @returns Promise that resolves when data is copied or rejects with error
 */
export const copyToClipboard = (data: any): Promise<void> => {
    const jsonString = JSON.stringify(data, null, 2);
    
    return navigator.clipboard.writeText(jsonString)
        .then(() => {
            console.log('Data copied to clipboard');
        })
        .catch((err) => {
            console.error('Failed to copy data: ', err);
            throw err;
        });
};

/**
 * Check if clipboard API is available
 * @returns Boolean indicating if clipboard API is available
 */
export const isClipboardAvailable = (): boolean => {
    return navigator && 'clipboard' in navigator;
}; 