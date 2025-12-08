import { useAppDispatch } from '@/lib/redux/hooks';
import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/router';
import { cn } from '@/utils';
import EntityInput, { EntityInputProps } from './field-components/EntityInput';
import EntityButton from './other-components/EntityButton';

type RelationType =
    | 'foreignKey' // Single reference to another entity
    | 'inverseForeignKey' // References from other entities
    | 'manyToMany' // Many-to-many relationship
    | 'lookup' // Simple lookup/reference data
    | 'hierarchical'; // Parent-child relationships

type DisplayMode =
    | 'inline' // Expand in place
    | 'modal' // Show in modal
    | 'sheet' // Side sheet
    | 'page' // Route to new page
    | 'transform' // Transform current field
    | 'popover'; // Show in popover

type LoadingStrategy =
    | 'eager' // Load with parent
    | 'lazy' // Load on demand
    | 'partial' // Load summary first
    | 'paginated' // Load in pages
    | 'virtual'; // Virtual scroll loading

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
        fields?: string[]; // Fields to display
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
            handler: string; // Redux saga action name
        }[];
    };
}

interface RelationalButtonBaseProps {
    config: RelationalConfig;
    currentValue: any;
    onAction: (action: string, payload?: any) => void;
    loading?: boolean;
    error?: string;
}

const RelationalButton: React.FC<RelationalButtonBaseProps> = ({ config, currentValue, onAction, loading, error }) => {
    const buttonVariant = config.type === 'foreignKey' ? 'outline' : 'ghost';

    const Spinner: React.FC<{ className?: string }> = ({ className }) => <div className={cn('spinner', className)}></div>;

    return (
        <EntityButton
            variant={buttonVariant}
            size='sm'
            onClick={() => onAction('view')}
            disabled={loading}
        >
            {loading ? <Spinner className='mr-2 h-4 w-4' /> : <SearchIcon className='mr-2 h-4 w-4' />}
            {config.type === 'foreignKey' ? 'View' : `View ${config.target.entity}`}
        </EntityButton>
    );
};

interface RelationalInputProps extends EntityInputProps {
    relational?: RelationalConfig;
}

const RelationalInput: React.FC<RelationalInputProps> = ({
    entityKey,
    dynamicFieldInfo,
    value,
    onChange,
    disabled,
    className,
    density,
    animationPreset,
    size,
    textSize,
    variant,
    floatingLabel,
    relational,
}) => {
    // Redux hooks
    const dispatch = useAppDispatch();
    // const relatedData = useAppSelector(selectRelatedData(relational?.target.entity));
    // const loading = useAppSelector(selectRelatedDataLoading(relational?.target.entity));
    const loading = false;
    const router = useRouter();

    const handleAction = (action: string, payload?: any) => {
        switch (relational?.display.mode) {
            case 'inline':
                dispatch({
                    type: 'LOAD_RELATED_DATA_INLINE',
                    payload: {
                        entity: relational.target.entity,
                        id: value,
                    },
                });
                break;

            case 'modal':
                dispatch({
                    type: 'OPEN_RELATIONAL_MODAL',
                    payload: {
                        config: relational,
                        currentValue: value,
                    },
                });
                break;

            case 'sheet':
                dispatch({
                    type: 'OPEN_RELATIONAL_SHEET',
                    payload: {
                        config: relational,
                        currentValue: value,
                    },
                });
                break;

            case 'page':
                router.push(`/${relational.target.entity}/${value}`);
                break;
        }
    };

    return (
        <div className='relative flex gap-2'>
            <EntityInput
                entityKey={entityKey}
                dynamicFieldInfo={dynamicFieldInfo}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={className}
                density={density}
                animationPreset={animationPreset}
                size={size}
                textSize={textSize}
                variant={variant}
                floatingLabel={floatingLabel}
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

export { RelationalInput, RelationalButton };
export type { RelationalConfig, RelationalInputProps, RelationalButtonBaseProps };
