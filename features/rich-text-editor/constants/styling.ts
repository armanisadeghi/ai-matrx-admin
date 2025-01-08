
export interface ToolbarConfig {
    colors: {
        text: { label: string; value: string }[];
        background: { label: string; value: string }[];
    };
    fontSizes: { label: string; value: string }[];
}



export const TOOLBAR_CONFIG: ToolbarConfig = {
    colors: {
        text: [
            { label: 'Default', value: 'inherit' },
            { label: 'Gray', value: '#6B7280' },
            { label: 'Red', value: '#EF4444' },
            { label: 'Blue', value: '#3B82F6' },
            { label: 'Green', value: '#10B981' },
        ],
        background: [
            { label: 'None', value: 'transparent' },
            { label: 'Gray', value: '#F3F4F6' },
            { label: 'Red', value: '#FEE2E2' },
            { label: 'Blue', value: '#DBEAFE' },
            { label: 'Green', value: '#D1FAE5' },
        ],
    },
    fontSizes: [
        { label: 'Small', value: '1' },
        { label: 'Normal', value: '2' },
        { label: 'Large', value: '3' },
        { label: 'Larger', value: '4' },
        { label: 'XL', value: '5' },
    ],
};
