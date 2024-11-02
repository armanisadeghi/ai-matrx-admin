import { ReactNode } from 'react';
import { TableState } from 'react-table';
import { EntityKeys } from '@/types/entityTypes';

// Component-specific configurations
export interface ComponentConfigs {
    header?: {
        sortable?: boolean;
        customHeader?: ReactNode;
        headerClassName?: string;
        sortIconPosition?: 'left' | 'right';
    };
    cell?: {
        interactive?: boolean;
        truncate?: boolean;
        truncateAt?: number;
        tooltipContent?: (value: any) => ReactNode;
        className?: string;
        animations?: {
            hover?: boolean;
            click?: boolean;
            custom?: any;
        };
    };
    actions?: {
        position?: 'left' | 'right' | 'both';
        iconSize?: number;
        tooltips?: boolean;
        confirmations?: boolean;
    };
}

// Enhanced relationship configuration
export interface RelationshipConfig<TEntity extends EntityKeys> {
    entityKey: TEntity;
    displayField: string;
    valueField: string;
    type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    joinConfig?: {
        localField: string;
        foreignField: string;
        through?: {
            table: string;
            localField: string;
            foreignField: string;
        };
    };
    // Component-specific configurations for relationship display
    display?: {
        inline?: boolean;
        lazy?: boolean;
        component?: ReactNode;
        cellConfig?: ComponentConfigs['cell'];
        headerConfig?: ComponentConfigs['header'];
    };
    // Relationship-specific actions
    actions?: {
        view?: boolean;
        edit?: boolean;
        delete?: boolean;
        custom?: Array<{
            name: string;
            handler: (data: any) => void;
            icon?: ReactNode;
        }>;
    };
    // Loading states and error handling
    loading?: {
        strategy: 'eager' | 'lazy' | 'onDemand';
        placeholder?: ReactNode;
    };
}

// Column definition with component awareness
export interface EnhancedColumnDef<TEntity extends EntityKeys> {
    Header: string;
    accessor: string;
    Cell?: (props: {
        value: any;
        row: any;
        relationship?: RelationshipConfig<TEntity>;
        config?: ComponentConfigs['cell'];
    }) => ReactNode;
    components?: ComponentConfigs;
    serverConfig?: {
        sortKey?: string;
        filterKey?: string;
        searchKey?: string;
    };
    relationship?: RelationshipConfig<TEntity>;
}

// Server state with relationship awareness
export interface ServerSideState {
    pagination: {
        pageIndex: number;
        pageSize: number;
        totalCount: number;
    };
    sorting: Array<{
        id: string;
        desc: boolean;
        entityKey?: EntityKeys;
    }>;
    filters: Array<{
        id: string;
        value: any;
        operator: string;
        entityKey?: EntityKeys;
        relationship?: string;
    }>;
    search: {
        value: string;
        fields: string[];
        includeRelated?: boolean;
        relationshipFields?: Array<{
            entityKey: EntityKeys;
            fields: string[];
        }>;
    };
    relationships: {
        [key: string]: {
            loaded: boolean;
            loading: boolean;
            error?: any;
            data?: any[];
            state?: ServerSideState;
        };
    };
}

// Hook result type with component state management
export interface TableStateHookResult<TEntity extends EntityKeys> {
    state: ServerSideState;
    data: any[];
    loading: boolean;
    error: any;
    updateState: (newState: Partial<ServerSideState>) => void;
    componentState: {
        visibleColumns: string[];
        activeRelationships: string[];
        modalState: {
            isOpen: boolean;
            type: string;
            data?: any;
        };
        actionStates: {
            [key: string]: boolean;
        };
    };
    relationships: {
        [K in EntityKeys]?: {
            data: any[];
            loading: boolean;
            error: any;
            actions: {
                load: () => Promise<void>;
                reload: () => Promise<void>;
                update: (data: any) => Promise<void>;
            };
        };
    };
    dispatch: (action: any) => void;
    selectors: {
        getData: (state: any) => any[];
        getLoading: (state: any) => boolean;
        getError: (state: any) => any;
        getTotalCount: (state: any) => number;
        getRelatedData: (entityKey: EntityKeys) => any[];
        getComponentState: (component: string) => any;
    };
}

// Table props with component configuration
export interface EnhancedMatrxTableProps<TEntity extends EntityKeys> {
    data: any[];
    isServerSide?: boolean;
    serverProps?: ServerSideProps<TEntity>;
    relationships?: RelationshipConfig<EntityKeys>[];
    components?: {
        header?: typeof MatrxTableHeader;
        cell?: typeof MatrxTableCell;
        topOptions?: typeof TableTopOptions;
        bottomSection?: typeof TableBottomSection;
        modal?: React.ComponentType<any>;
        expandedRow?: React.ComponentType<any>;
        loading?: React.ComponentType<any>;
        empty?: React.ComponentType<any>;
        error?: React.ComponentType<any>;
        customComponents?: {
            [key: string]: React.ComponentType<any>;
        };
    };
    componentConfigs?: ComponentConfigs;
    onStateChange?: (state: ServerSideState) => void;
    onComponentStateChange?: (state: any) => void;
    interactions?: {
        selectable?: boolean;
        expandable?: boolean;
        sortable?: boolean;
        filterable?: boolean;
        searchable?: boolean;
        draggable?: boolean;
    };
    animations?: AnimationConfig;
    modal?: ModalConfig;
    actions?: TableAction[];
    onStateChange?: (state: TableComponentState) => void;
    className?: string;
    style?: React.CSSProperties;
}

// Separate component state management
export interface ComponentState {
    isActive: boolean;
    isVisible: boolean;
    isLoading?: boolean;
    error?: any;
    localState?: Record<string, any>;
}

// Enhanced component registry for dynamic loading
export interface ComponentRegistry {
    [key: string]: {
        component: React.ComponentType<any>;
        state: ComponentState;
        config: Partial<ComponentConfigs>;
    };
}

// Action definition with enhanced typing
export interface TableAction<TData = any> {
    name: string;
    icon?: ReactNode;
    position?: 'row' | 'header' | 'toolbar';
    handler: (data: TData, context: TableActionContext) => void | Promise<void>;
    isVisible?: (data: TData) => boolean;
    isEnabled?: (data: TData) => boolean;
    confirmation?: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
    };
}

// Context passed to action handlers
export interface TableActionContext {
    dispatch: (action: any) => void;
    updateState: (newState: Partial<ServerSideState>) => void;
    relationships: Record<EntityKeys, RelationshipState>;
    componentRegistry: ComponentRegistry;
}

// Relationship state management
export interface RelationshipState {
    data: any[];
    loading: boolean;
    error: any;
    metadata: {
        lastLoaded?: Date;
        totalCount?: number;
        hasMore?: boolean;
    };
    actions: {
        load: () => Promise<void>;
        reload: () => Promise<void>;
        update: (data: any) => Promise<void>;
        loadMore?: () => Promise<void>;
    };
}

// Component-specific state management
export interface TableComponentState {
    header: {
        sortState: Array<{ id: string; desc: boolean }>;
        visibleColumns: string[];
        customStates: Record<string, any>;
    };
    toolbar: {
        searchValue: string;
        activeFilters: Record<string, any>;
        customActions: Record<string, boolean>;
    };
    body: {
        selectedRows: Record<string, boolean>;
        expandedRows: Record<string, boolean>;
        loadingRows: Record<string, boolean>;
    };
    footer: {
        pagination: {
            currentPage: number;
            pageSize: number;
            totalPages: number;
        };
        customStates: Record<string, any>;
    };
}

// Enhanced hook result with component awareness
export interface TableStateHookResult<TEntity extends EntityKeys> {
    state: ServerSideState;
    data: any[];
    loading: boolean;
    error: any;

    // Component Management
    components: {
        registry: ComponentRegistry;
        states: TableComponentState;
        actions: {
            registerComponent: (key: string, component: React.ComponentType<any>) => void;
            updateComponentState: (key: string, state: Partial<ComponentState>) => void;
            updateComponentConfig: (key: string, config: Partial<ComponentConfigs>) => void;
        };
    };

    // Relationship Management
    relationships: Record<EntityKeys, RelationshipState>;

    // State Management
    updateState: (newState: Partial<ServerSideState>) => void;
    dispatch: (action: any) => void;

    // Action Management
    actions: {
        register: (action: TableAction) => void;
        execute: (name: string, data: any) => Promise<void>;
        batch: (actions: TableAction[]) => Promise<void>;
    };
}

// Props for sub-components with strict typing
export interface TableHeaderProps {
    columns: EnhancedColumnDef<EntityKeys>[];
    onSort: (sortState: Array<{ id: string; desc: boolean }>) => void;
    componentState: TableComponentState['header'];
    actions?: TableAction[];
    config?: ComponentConfigs['header'];
}

export interface TableToolbarProps {
    onSearch: (value: string) => void;
    onFilter: (filters: Record<string, any>) => void;
    componentState: TableComponentState['toolbar'];
    actions?: TableAction[];
    config?: ComponentConfigs['actions'];
}

export interface TableBodyProps {
    data: any[];
    columns: EnhancedColumnDef<EntityKeys>[];
    componentState: TableComponentState['body'];
    onRowAction: (action: string, row: any) => void;
    config?: ComponentConfigs['cell'];
}

export interface ModalState<TData = any> {
    isOpen: boolean;
    type: 'view' | 'edit' | 'delete' | 'custom';
    activeTab?: string;
    data?: TData;
    formState?: Record<string, any>;
    customContent?: React.ReactNode | ((data: TData) => React.ReactNode);
}

export interface ModalConfig {
    tabs?: {
        available: string[];
        default: string;
        handlers?: Record<string, (data: any) => void>;
    };
    animations?: {
        enter?: Record<string, any>;
        exit?: Record<string, any>;
        transition?: Record<string, any>;
    };
    form?: {
        initialState?: Record<string, any>;
        validation?: Record<string, (value: any) => boolean>;
        transformers?: Record<string, (value: any) => any>;
    };
}

// Animation Configurations
export interface AnimationConfig {
    row?: {
        initial?: Record<string, any>;
        animate?: Record<string, any>;
        exit?: Record<string, any>;
        hover?: Record<string, any>;
        transition?: Record<string, any>;
    };
    cell?: {
        initial?: Record<string, any>;
        animate?: Record<string, any>;
        hover?: Record<string, any>;
    };
    modal?: {
        initial?: Record<string, any>;
        animate?: Record<string, any>;
        exit?: Record<string, any>;
    };
}

// Enhanced Action System
export interface TableAction<TData = any> {
    name: string;
    icon?: React.ReactNode;
    label?: string;
    position?: 'row' | 'header' | 'toolbar';
    handler: (data: TData, context: TableActionContext) => void | Promise<void>;
    isVisible?: (data: TData) => boolean;
    isEnabled?: (data: TData) => boolean;
    confirmation?: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
    };
    modal?: {
        component?: React.ComponentType<any>;
        config?: Partial<ModalConfig>;
    };
    order?: number;
    group?: string;
    shortcut?: string;
}

// Component State Management
export interface TableComponentState {
    modal: ModalState;
    animations: {
        enabled: boolean;
        current: Record<string, boolean>;
    };
    selection: {
        selected: Record<string, boolean>;
        lastSelected?: string;
    };
    expansion: {
        expanded: Record<string, boolean>;
        loading: Record<string, boolean>;
    };
    visibility: {
        columns: string[];
        actions: string[];
    };
    sorting: {
        columns: Array<{ id: string; desc: boolean }>;
        enabled: boolean;
    };
    filters: {
        active: Record<string, any>;
        available: string[];
    };
    search: {
        value: string;
        fields: string[];
    };
}

// Enhanced Table Body Props
export interface EnhancedTableBodyProps<TData = any> {
    page: any[];
    prepareRow: (row: any) => void;
    actions?: TableAction<TData>[];
    onAction?: (action: string, rowData: TData) => void;
    truncateAt?: number;
    customModalContent?: (rowData: TData) => React.ReactNode;
    animations?: AnimationConfig;
    modal?: ModalConfig;
    onSelectionChange?: (selected: Record<string, boolean>) => void;
    onExpansionChange?: (expanded: Record<string, boolean>) => void;
    renderExpanded?: (row: TData) => React.ReactNode;
    rowClassName?: string | ((row: TData) => string);
    cellClassName?: string | ((cell: any, row: TData) => string);
}

// Hook for managing table interactions
export interface UseTableInteractions<TData = any> {
    state: TableComponentState;
    handlers: {
        handleAction: (action: string, data: TData) => void;
        handleSelection: (id: string, selected: boolean) => void;
        handleExpansion: (id: string, expanded: boolean) => void;
        handleSort: (columnId: string) => void;
        handleFilter: (filterId: string, value: any) => void;
        handleSearch: (value: string) => void;
        handleModalClose: () => void;
        handleModalSubmit: (data: any) => void;
        handleTabChange: (tab: string) => void;
    };
    modal: {
        isOpen: boolean;
        content: React.ReactNode;
        config: ModalConfig;
    };
    selection: {
        selected: Record<string, boolean>;
        allSelected: boolean;
        someSelected: boolean;
    };
    expansion: {
        expanded: Record<string, boolean>;
        loading: Record<string, boolean>;
    };
}

// Core component configurations
export interface ComponentStateConfig {
    isEnabled: boolean;
    isVisible: boolean;
    isLoading?: boolean;
    error?: any;
    localState?: Record<string, any>;
}

// Modal specific types
export interface ModalTabConfig {
    id: string;
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode | ((data: any) => React.ReactNode);
    actions?: TableAction[];
    validation?: (data: any) => boolean | Promise<boolean>;
    transform?: (data: any) => any;
}

export interface EnhancedModalState extends ModalState {
    tabs: ModalTabConfig[];
    activeTab: string;
    formState: Record<string, any>;
    validation: {
        isValid: boolean;
        errors: Record<string, string>;
    };
    history: {
        past: Record<string, any>[];
        future: Record<string, any>[];
    };
}

// Enhanced cell configurations
export interface EnhancedCellConfig extends ComponentConfigs['cell'] {
    formatter?: (value: any) => any;
    validator?: (value: any) => boolean | string;
    editor?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
    actions?: {
        onClick?: (value: any, row: any) => void;
        onDoubleClick?: (value: any, row: any) => void;
        onContextMenu?: (value: any, row: any) => void;
    };
    style?: {
        conditions?: Array<{
            when: (value: any, row: any) => boolean;
            apply: React.CSSProperties;
        }>;
    };
}

// Action system enhancements
export interface TableActionWithContext<TData = any> extends TableAction<TData> {
    context: {
        modal?: {
            tabs?: ModalTabConfig[];
            defaultTab?: string;
            onSubmit?: (data: any) => Promise<void>;
        };
        toolbar?: {
            position?: 'left' | 'right';
            group?: string;
            priority?: number;
        };
        cell?: {
            position?: 'start' | 'end';
            showOnHover?: boolean;
        };
    };
    permissions?: {
        isAllowed: (data: TData) => boolean;
        deniedMessage?: string;
        fallbackAction?: string;
    };
}

// Component state management
export interface EnhancedComponentState extends TableComponentState {
    modal: EnhancedModalState;
    toolbar: {
        search: {
            value: string;
            fields: string[];
            suggestions?: string[];
            history?: string[];
        };
        filters: {
            active: Record<string, any>;
            available: Array<{
                field: string;
                operators: string[];
                values?: any[];
            }>;
        };
        actions: {
            visible: string[];
            disabled: string[];
            loading: string[];
        };
    };
    rows: {
        selected: Record<string, boolean>;
        expanded: Record<string, boolean>;
        loading: Record<string, boolean>;
        errors: Record<string, string>;
        modified: Record<string, boolean>;
        originalData: Record<string, any>;
    };
    cells: {
        editing: Record<string, boolean>;
        valid: Record<string, boolean>;
        modified: Record<string, boolean>;
        original: Record<string, any>;
    };
}

// Hook result with enhanced functionality
export interface EnhancedTableHookResult<TEntity extends EntityKeys> {
    state: ServerSideState;
    componentState: EnhancedComponentState;
    actions: {
        table: {
            refresh: () => Promise<void>;
            reset: () => void;
            export: (format: string) => Promise<void>;
        };
        rows: {
            select: (ids: string[]) => void;
            expand: (ids: string[]) => void;
            delete: (ids: string[]) => Promise<void>;
            update: (id: string, data: any) => Promise<void>;
        };
        modal: {
            open: (type: string, data?: any) => void;
            close: () => void;
            submit: () => Promise<void>;
            setTab: (tabId: string) => void;
        };
        toolbar: {
            search: (value: string) => void;
            filter: (filters: Record<string, any>) => void;
            toggleAction: (actionId: string) => void;
        };
    };
    handlers: {
        onRowClick: (row: any) => void;
        onCellClick: (cell: any, row: any) => void;
        onActionClick: (action: string, context: any) => void;
        onStateChange: (newState: Partial<ServerSideState>) => void;
    };
}

// Props for main table component
export interface EnhancedTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    initialState?: Partial<ServerSideState>;
    components?: {
        toolbar?: React.ComponentType<TableToolbarProps>;
        header?: React.ComponentType<TableHeaderProps>;
        body?: React.ComponentType<TableBodyProps>;
        footer?: React.ComponentType<TableBottomSectionProps>;
        modal?: React.ComponentType<any>;
        loading?: React.ComponentType<any>;
        empty?: React.ComponentType<any>;
        error?: React.ComponentType<any>;
    };
    actions?: TableActionWithContext[];
    config?: {
        pagination?: {
            enabled: boolean;
            pageSize: number;
            pageSizeOptions: number[];
        };
        selection?: {
            enabled: boolean;
            mode: 'single' | 'multiple';
        };
        expansion?: {
            enabled: boolean;
            mode: 'single' | 'multiple';
        };
        sorting?: {
            enabled: boolean;
            mode: 'single' | 'multiple';
        };
        filtering?: {
            enabled: boolean;
            mode: 'simple' | 'advanced';
        };
    };
    className?: string;
    style?: React.CSSProperties;
}

export interface SchemaColumnDef<TEntity extends EntityKeys> {
    field: keyof EntityData<TEntity>;
    schemaField: AutomationEntity<TEntity>['entityFields'][keyof AutomationEntity<TEntity>['entityFields']];
    config?: {
        useDisplayName?: boolean; // Use pretty name from schema
        component?: string; // Override default component from schema
        formatValue?: (value: any, schema: typeof schemaField) => any;
        width?: string | number;
        sortable?: boolean;
        filterable?: boolean;
    };
}

