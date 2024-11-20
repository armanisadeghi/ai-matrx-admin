# Relational Input System

## Component Types

```typescript
type RelationType = 
  | 'foreignKey'           // Single reference to another entity
  | 'inverseForeignKey'    // References from other entities
  | 'manyToMany'           // Many-to-many relationship
  | 'lookup'               // Simple lookup/reference data
  | 'hierarchical';        // Parent-child relationships

type DisplayMode =
  | 'inline'               // Expand in place
  | 'modal'                // Show in modal
  | 'sheet'                // Side sheet
  | 'page'                 // Route to new page
  | 'transform'            // Transform current field
  | 'popover';            // Show in popover

type LoadingStrategy = 
  | 'eager'                // Load with parent
  | 'lazy'                 // Load on demand
  | 'partial'              // Load summary first
  | 'paginated'            // Load in pages
  | 'virtual';             // Virtual scroll loading

interface RelationalConfig {
  type: RelationType;
  target: {
    entity: string;
    displayField: string;
    searchFields?: string[];
  };
  display: {
    mode: DisplayMode;
    layout?: 'table' | 'grid' | 'list' | 'tree';
    fields?: string[];     // Fields to display
  };
  loading: {
    strategy: LoadingStrategy;
    pageSize?: number;
    preloadFields?: string[];
  };
  actions?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    custom?: {
      name: string;
      handler: string;    // Redux saga action name
    }[];
  };
}
```

## Enhanced Input Components

```typescript
interface RelationalButtonProps {
  config: RelationalConfig;
  currentValue: any;
  onAction: (action: string, payload?: any) => void;
  loading?: boolean;
  error?: string;
}

const RelationalButton: React.FC<RelationalButtonProps> = ({
  config,
  currentValue,
  onAction,
  loading,
  error
}) => {
  const buttonVariant = config.type === 'foreignKey' ? 'outline' : 'ghost';
  
  return (
    <Button
      variant={buttonVariant}
      size="sm"
      onClick={() => onAction('view')}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="mr-2 h-4 w-4" />
      ) : (
        <SearchIcon className="mr-2 h-4 w-4" />
      )}
      {config.type === 'foreignKey' ? 'View' : `View ${config.target.entity}`}
    </Button>
  );
};

interface RelationalInputProps extends InputBaseProps {
  relational?: RelationalConfig;
}

const RelationalInput: React.FC<RelationalInputProps> = ({
  value,
  onChange,
  relational,
  ...props
}) => {
  // Redux hooks
  const dispatch = useDispatch();
  const relatedData = useSelector(selectRelatedData(relational?.target.entity));
  const loading = useSelector(selectRelatedDataLoading(relational?.target.entity));
  
  const handleAction = (action: string, payload?: any) => {
    switch (relational?.display.mode) {
      case 'inline':
        dispatch({ 
          type: 'LOAD_RELATED_DATA_INLINE',
          payload: { 
            entity: relational.target.entity,
            id: value 
          }
        });
        break;
        
      case 'modal':
        dispatch({ 
          type: 'OPEN_RELATIONAL_MODAL',
          payload: {
            config: relational,
            currentValue: value
          }
        });
        break;
        
      case 'sheet':
        dispatch({ 
          type: 'OPEN_RELATIONAL_SHEET',
          payload: {
            config: relational,
            currentValue: value
          }
        });
        break;
        
      case 'page':
        router.push(`/${relational.target.entity}/${value}`);
        break;
    }
  };

  return (
    <div className="relative flex gap-2">
      <Input
        {...props}
        value={value}
        onChange={onChange}
      />
      {relational && (
        <RelationalButton
          config={relational}
          currentValue={value}
          onAction={handleAction}
          loading={loading}
        />
      )}
    </div>
  );
};
```

## Redux Saga Handlers

```typescript
function* handleRelationalDataLoad(action) {
  const { entity, id, config } = action.payload;
  
  try {
    switch (config.loading.strategy) {
      case 'eager':
        // Load all related data at once
        const allData = yield call(api.getRelatedData, entity, id);
        yield put({ type: 'SET_RELATED_DATA', payload: allData });
        break;
        
      case 'partial':
        // Load summary first
        const summary = yield call(api.getRelatedSummary, entity, id);
        yield put({ type: 'SET_RELATED_SUMMARY', payload: summary });
        
        // Then load details if needed
        if (config.display.mode === 'inline') {
          const details = yield call(api.getRelatedDetails, entity, id);
          yield put({ type: 'SET_RELATED_DETAILS', payload: details });
        }
        break;
        
      case 'paginated':
        const firstPage = yield call(
          api.getRelatedDataPaginated, 
          entity, 
          id, 
          { page: 1, pageSize: config.loading.pageSize }
        );
        yield put({ type: 'SET_RELATED_DATA_PAGE', payload: firstPage });
        break;
    }
  } catch (error) {
    yield put({ type: 'SET_RELATED_DATA_ERROR', payload: error });
  }
}
```

## Display Components

```typescript
const RelationalDisplay: React.FC<{
  config: RelationalConfig;
  data: any;
}> = ({ config, data }) => {
  switch (config.display.layout) {
    case 'table':
      return (
        <RelationalTable 
          data={data}
          columns={config.display.fields}
          actions={config.actions}
        />
      );
      
    case 'grid':
      return (
        <RelationalGrid 
          data={data}
          fields={config.display.fields}
          actions={config.actions}
        />
      );
      
    case 'tree':
      return (
        <RelationalTree 
          data={data}
          displayField={config.target.displayField}
          actions={config.actions}
        />
      );
      
    default:
      return (
        <RelationalList 
          data={data}
          fields={config.display.fields}
          actions={config.actions}
        />
      );
  }
};
```

## Schema Example

```typescript
{
  defaultComponent: 'input',
  componentProps: {
    subComponent: 'basic',
    relational: {
      type: 'foreignKey',
      target: {
        entity: 'departments',
        displayField: 'name',
        searchFields: ['name', 'code']
      },
      display: {
        mode: 'modal',
        layout: 'table',
        fields: ['name', 'code', 'manager', 'employeeCount']
      },
      loading: {
        strategy: 'partial',
        preloadFields: ['name', 'code']
      },
      actions: {
        create: true,
        edit: true,
        delete: false,
        custom: [
          {
            name: 'Export',
            handler: 'EXPORT_DEPARTMENT_DATA'
          }
        ]
      }
    }
  }
}
```

This system provides:

1. **Flexibility** in how related data is displayed and loaded
2. **Performance optimization** through different loading strategies
3. **Consistent UX** across different types of relationships
4. **Extensibility** through custom actions and displays
5. **Type safety** through comprehensive interfaces

The key benefits are:
1. Centralized handling of relational data
2. Consistent loading patterns
3. Flexible display options
4. Built-in performance optimizations
5. Type-safe configuration

Would you like me to elaborate on any particular aspect or provide more detailed implementation examples?
