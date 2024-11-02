/*
// Types to support the flexible structure
type PrimaryKeyMapping = {
    actualField: string;     // The actual DB field name (e.g., 'id', 'user_id', 'order_number')  -- Array?
    type: 'number' | 'string' | 'composite';
    composer?: (entity: any) => string; // For composite keys
};

type RelationConfig = {
    foreignTable: string;    // Name of the related table
    foreignKey: string;      // Field in this table pointing to foreign table
    type: 'oneToMany' | 'manyToOne' | 'manyToMany';
    through?: string;        // For many-to-many, the junction table
    displayField?: string;   // Field to use when displaying the related entity
};

type TableConfig = {
    tableName: string;
    primaryKey: PrimaryKeyMapping;
    displayField?: string;
    relations: Record<string, RelationConfig>;
};

// Base class for dynamic slices
class DynamicSlice {
    private config: TableConfig;
    private applets: Record<string, any> = {};
    private relationCache: Record<string, Record<string, string[]>> = {};

    constructor(config: TableConfig) {
        this.config = config;
    }

    // Get the internal primary key for any entity
    private getInternalKey(entity: any): string {
        const { primaryKey } = this.config;

        if (primaryKey.type === 'composite' && primaryKey.composer) {
            return primaryKey.composer(entity);
        }

        return entity[primaryKey.actualField].toString();
    }

    // Add or update an entity
    addEntity(entity: any) {
        const internalKey = this.getInternalKey(entity);

        // Enhance entity with consistent internal primary key
        const enhancedEntity = {
            ...entity,
            _internalKey: internalKey,
            _displayValue: entity[this.config.displayField || primaryKey.actualField]
        };

        this.applets[internalKey] = enhancedEntity;
        this.updateRelationships(enhancedEntity);
    }

    // Update relationship cache for an entity
    private updateRelationships(entity: any) {
        Object.entries(this.config.relations).forEach(([relationName, relationConfig]) => {
            const { foreignTable, foreignKey, type } = relationConfig;

            if (type === 'manyToOne') {
                if (!this.relationCache[foreignTable]) {
                    this.relationCache[foreignTable] = {};
                }

                const foreignKeyValue = entity[foreignKey];
                if (foreignKeyValue) {
                    if (!this.relationCache[foreignTable][foreignKeyValue]) {
                        this.relationCache[foreignTable][foreignKeyValue] = [];
                    }
                    this.relationCache[foreignTable][foreignKeyValue].push(this.getInternalKey(entity));
                }
            }
        });
    }

    // Get related applets
    getRelated(internalKey: string, relationName: string): string[] {
        const entity = this.applets[internalKey];
        const relationConfig = this.config.relations[relationName];

        if (!entity || !relationConfig) return [];

        if (relationConfig.type === 'manyToOne') {
            const foreignKeyValue = entity[relationConfig.foreignKey];
            return this.relationCache[relationConfig.foreignTable]?.[foreignKeyValue] || [];
        }

        return [];
    }

    // Get display value for an entity
    getDisplayValue(internalKey: string): string {
        const entity = this.applets[internalKey];
        if (!entity) return '';

        return entity._displayValue;
    }
}

// Example usage:
const ordersConfig: TableConfig = {
    tableName: 'orders',
    primaryKey: {
        actualField: 'order_number',
        type: 'string'
    },
    displayField: 'order_title',
    relations: {
        customer: {
            foreignTable: 'customers',
            foreignKey: 'customer_id',
            type: 'manyToOne',
            displayField: 'customer_name'
        }
    }
};

// Complex composite key example
const invoiceConfig: TableConfig = {
    tableName: 'invoices',
    primaryKey: {
        actualField: ['year', 'sequence'],
        type: 'composite',
        composer: (entity) => `${entity.year}-${entity.sequence}`
    },
    displayField: 'invoice_number',
    relations: {
        order: {
            foreignTable: 'orders',
            foreignKey: 'order_number',
            type: 'manyToOne'
        }
    }
};

// Usage example
const orderSlice = new DynamicSlice(ordersConfig);

orderSlice.addEntity({
    order_number: 'ORD-2024-001',
    order_title: 'March Hardware Order',
    customer_id: 'CUST001',
    // ... other fields
});
*/
