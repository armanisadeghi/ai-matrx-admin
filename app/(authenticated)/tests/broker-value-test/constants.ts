// Types for our system

import { BrokerValue, DataBroker } from './types';

// Mock data store
export const mockBrokers: Record<string, DataBroker> = {
    'user.theme': {
        id: 'user.theme',
        name: 'Theme Selection',
        description: 'Choose your preferred UI theme',
        dataType: 'string',
        config: {
            component: 'select',
            options: [
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
            ],
            isClearable: true,
            styles: {
                container: 'max-w-xs',
                label: 'font-medium',
            },
        },
    },
    'audio.volume': {
        id: 'audio.volume',
        name: 'Volume Level',
        description: 'Adjust the system volume',
        dataType: 'number',
        config: {
            component: 'slider',
            min: 0,
            max: 100,
            step: 1,
            showMarks: true,
            styles: {
                container: 'w-full max-w-md',
            },
        },
    },
    'notifications.enabled': {
        id: 'notifications.enabled',
        name: 'Enable Notifications',
        description: 'Receive system notifications',
        dataType: 'boolean',
        config: {
            component: 'switch',
            styles: {
                container: 'p-4 border rounded-lg',
            },
        },
    },
};

// Mock broker values store (simulating our database table)
export const mockBrokerValues = new Map<string, BrokerValue>();
