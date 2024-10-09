// components/ui/JsonEditor.tsx

'use client';

import React, {useEffect, useState} from 'react';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/lib/utils';
import {Loader2} from 'lucide-react';
import {generateJsonTemplate} from "@/utils/schema/schemaUtils";

const jsonSchema = z.string().refine((data) => {
    try {
        JSON.parse(data);
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
    initialData: string;
    onJsonChange?: (data: string) => void;
    validateDelay?: number;
}

export const BaseJsonEditor: React.FC<BaseJsonEditorProps> = (
    {
        initialData,
        onJsonChange,
        className,
        validateDelay = 500,
        ...props
    }) => {
    const [isValidating, setIsValidating] = useState(false);

    const {control, formState: {errors}} = useForm<FormData>({
        defaultValues: {
            jsonInput: initialData,
        },
        resolver: zodResolver(z.object({
            jsonInput: jsonSchema,
        })),
    });

    const handleChange = (value: string) => {
        setIsValidating(true);
        const timer = setTimeout(() => {
            try {
                JSON.parse(value); // Validate JSON
                onJsonChange?.(value);
            } catch (error) {
                // Validation error will be handled by zod
            } finally {
                setIsValidating(false);
            }
        }, validateDelay);

        return () => clearTimeout(timer);
    };

    return (
        <div className="relative">
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
            <AnimatePresence>
                {isValidating && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className="absolute top-2 right-2"
                    >
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {errors.jsonInput && (
                    <motion.div
                        initial={{opacity: 0, y: -10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -10}}
                        className="mt-2"
                    >
                        <Alert variant="destructive">
                            <AlertDescription>{errors.jsonInput.message}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface JsonEditorWithFormattingProps extends BaseJsonEditorProps {
    onFormat?: () => void;
}

export const JsonEditorWithFormatting: React.FC<JsonEditorWithFormattingProps> = (
    {
        onFormat,
        ...props
    }) => {
    return (
        <div className="space-y-2">
            <BaseJsonEditor {...props} />
            <Button onClick={onFormat} variant="outline">Format JSON</Button>
        </div>
    );
};

interface FullJsonEditorProps extends JsonEditorWithFormattingProps {
    onSave?: (data: string) => void;
    title?: string;
}

export const FullJsonEditor: React.FC<FullJsonEditorProps> = (
    {
        initialData,
        onSave,
        onFormat,
        title = "JSON Editor",
        className,
        ...props
    }) => {
    const [jsonData, setJsonData] = useState(initialData);

    const handleSubmit = () => {
        onSave?.(jsonData);
    };

    const handleFormat = () => {
        try {
            const formatted = JSON.stringify(JSON.parse(jsonData), null, 2);
            setJsonData(formatted);
            onFormat?.();
        } catch (error) {
            console.error('Error formatting JSON:', error);
        }
    };

    return (
        <Card className={cn("p-6 space-y-4", className)}>
            <h2 className="text-2xl font-bold">{title}</h2>
            <JsonEditorWithFormatting
                initialData={jsonData}
                onJsonChange={setJsonData}
                onFormat={handleFormat}
                {...props}
            />
            <Button onClick={handleSubmit}>Save Changes</Button>
        </Card>
    );
};

interface SchemaJsonEditorProps {
    tableName: string;
    onSave?: (data: string) => void;
    onFormat?: () => void;
    title?: string;
    className?: string;
}

export const SchemaJsonEditor: React.FC<SchemaJsonEditorProps> = (
    {
        tableName,
        onSave,
        onFormat,
        title = "Schema JSON Editor",
        className,
    }) => {
    const [jsonData, setJsonData] = useState<string>('');

    useEffect(() => {
        // Generate the initial JSON template based on the schema
        const initialTemplate = generateJsonTemplate(tableName);
        setJsonData(JSON.stringify(initialTemplate, null, 2));
    }, [tableName]);

    const handleSave = () => {
        onSave?.(jsonData);
    };

    const handleFormat = () => {
        try {
            const formatted = JSON.stringify(JSON.parse(jsonData), null, 2);
            setJsonData(formatted);
            onFormat?.();
        } catch (error) {
            console.error('Error formatting JSON:', error);
        }
    };

    return (
        <FullJsonEditor
            initialData={jsonData}
            onJsonChange={setJsonData}
            onSave={handleSave}
            onFormat={handleFormat}
            title={title}
            className={cn(className)}
        />
    );
};
