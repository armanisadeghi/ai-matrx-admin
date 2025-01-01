// components/ContentArea.tsx
import { Variable } from '../../../../contexts/old/useVariablesStoreTwo';

interface ContentAreaProps {
    variables: Variable[];
    onVariableClick: (uuid: string) => void;
}

export const ContentArea = ({ variables, onVariableClick }: ContentAreaProps) => {
    return (
        <div className="p-4">
            <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                    !variable.isDeleted && (
                        <button
                            key={variable.uuid}
                            onClick={() => onVariableClick(variable.uuid)}
                            className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${
                                variable.mode === 'destructive'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                            }
                ${
                                variable.isReady
                                ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900'
                                : ''
                            }
              `}
                        >
                            {variable.displayName || 'Unnamed Variable'}
                        </button>
                    )
                ))}
            </div>
        </div>
    );
};
