/*
// types/applets/applets-components.ts
import { ReactNode } from 'react';
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {AppletEntityConfig, AppletState} from "@/types/applets/types";

export interface AppletLayoutProps {
    config: AppletConfig;
    children: ReactNode;
}

export interface AppletEntityViewProps<T extends EntityKeys> {
    config: AppletEntityConfig;
    data: EntityData<T>[];
    state: AppletState;
    onStateChange: (newState: Partial<AppletState>) => void;
}

export interface AppletNavigationProps {
    config: AppletConfig;
    currentEntity?: string;
    currentView?: string;
}

// Implementation example for the main Applet component structure
export interface AppletProps {
    config: AppletConfig;
    initialState?: Partial<AppletState>;
}

// Example of how to use these types with your existing Redux setup:
export function createAppletSlice(config: AppletConfig) {
    const initialState: AppletState = {
        currentView: config.defaultView || 'list',
        filters: {},
        sort: {
            field: config.entities[0]?.viewConfig.defaultSort?.field || 'id',
            direction: config.entities[0]?.viewConfig.defaultSort?.direction || 'asc',
        },
        pagination: {
            page: 1,
            pageSize: 10,
        },
        selectedItems: [],
    };

    // This would integrate with your existing Redux setup
    return {
        initialState,
        // Additional slice configuration would go here
    };
}



// Example applets configuration
const userManagementApplet: AppletConfig = {
    key: 'userManagement',
    displayName: 'User Management',
    entities: [{
        entityKey: 'users',
        displayName: 'Users',
        viewConfig: {
            defaultLayout: 'table',
            searchableFields: ['name', 'email']
        },
        fields: [
            {
                fieldKey: 'name',
                displayName: 'Name',
                visibility: {
                    list: true,
                    detail: true,
                    edit: true
                }
            }
            // ... other fields
        ]
    }]
};

*/
