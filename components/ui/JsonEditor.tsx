// components/ui/JsonEditor.tsx

import React, {useState} from 'react';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/lib/utils';

// JSON validation schema
const jsonSchema = z.any().refine((data) => {
    try {
        JSON.parse(JSON.stringify(data));
        return true;
    } catch {
        return false;
    }
}, {
    message: "Invalid JSON format",
});

type FormData = {
    jsonInput: string;
};

interface BaseJsonEditorProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    initialData?: object;
    onJsonChange?: (data: object) => void;
}

// Base JSON Editor (just the textarea)
export const BaseJsonEditor: React.FC<BaseJsonEditorProps> = (
    {
        initialData = {},
        onJsonChange,
        className,
        ...props
    }) => {
    const {control} = useForm<FormData>({
        defaultValues: {
            jsonInput: JSON.stringify(initialData, null, 2),
        },
        resolver: zodResolver(z.object({
            jsonInput: jsonSchema,
        })),
    });

    const handleChange = (value: string) => {
        try {
            const parsedData = JSON.parse(value);
            onJsonChange?.(parsedData);
        } catch (error) {
            // Optionally handle parsing errors
        }
    };

    return (
        <Controller
            name="jsonInput"
            control={control}
            render={({field}) => (
                <Textarea
                    {...field}
                    {...props}
                    className={cn("font-mono", className)}
                    onChange={(e) => {
                        field.onChange(e);
                        handleChange(e.target.value);
                    }}
                />
            )}
        />
    );
};

interface JsonEditorWithValidationProps extends BaseJsonEditorProps {
    showValidation?: boolean;
}

// JSON Editor with validation
export const JsonEditorWithValidation: React.FC<JsonEditorWithValidationProps> = (
    {
        showValidation = true,
        ...props
    }) => {
    const [error, setError] = useState<string | null>(null);

    const handleChange = (data: object) => {
        setError(null);
        props.onJsonChange?.(data);
    };

    return (
        <div className="space-y-2">
            <BaseJsonEditor {...props} onJsonChange={handleChange}/>
            {showValidation && (
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{opacity: 0, y: -10}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -10}}
                        >
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

interface FullJsonEditorProps extends JsonEditorWithValidationProps {
    onSave?: (data: object) => void;
}

// Full-featured JSON Editor
export const FullJsonEditor: React.FC<FullJsonEditorProps> = (
    {
        initialData = {},
        onSave,
        className,
        ...props
    }) => {
    const [jsonData, setJsonData] = useState(initialData);

    const handleSubmit = () => {
        onSave?.(jsonData);
    };

    return (
        <Card className={cn("p-6 space-y-4", className)}>
            <h2 className="text-2xl font-bold">JSON Editor</h2>
            <JsonEditorWithValidation
                initialData={initialData}
                onJsonChange={setJsonData}
                {...props}
            />
            <Button onClick={handleSubmit}>Update JSON</Button>
            <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Current JSON Data:</h3>
                <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-64">
          {JSON.stringify(jsonData, null, 2)}
        </pre>
            </div>
        </Card>
    );
};

