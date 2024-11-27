import React from 'react';
import {
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {Select, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Plus} from "lucide-react";
import {FullJsonViewer} from '@/components/ui';


// Inline Form Field Component (for testing purposes) -- this works to show fields, but is not currently connected to the Entity.
export const InlineFormField: React.FC = ({field, formField}) => {
    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <div className="flex flex-wrap gap-3 items-start">
                <div className="basis-[200px] grow">
                    <Input
                        {...formField}
                        value={formField.value ?? field.defaultValue}
                        placeholder="Primary Value"
                    />
                </div>
                <div className="basis-[200px] grow">
                    <Input
                        disabled
                        placeholder="Secondary Input"
                    />
                </div>
                <div className="basis-[250px] grow">
                    <Textarea
                        disabled
                        placeholder="Brief Description"
                        className="h-[38px] min-h-[38px] resize-none"
                    />
                </div>
                <div className="basis-[300px] grow">
                    <Textarea
                        disabled
                        placeholder="Detailed Notes"
                        className="h-[38px] min-h-[38px] resize-none"
                    />
                </div>
                <div className="basis-[180px] grow">
                    <Select disabled>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Type"/>
                        </SelectTrigger>
                    </Select>
                </div>
                <div className="basis-[250px] grow">
                    <FullJsonViewer
                        data={{"status": "pending"}}
                        title="JSON Preview"
                        maxHeight="38px"
                        className="!p-2 !bg-muted/20"
                        disabled={true}
                        hideControls={true}
                        hideTitle={true}
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-[38px]"
                    disabled
                >
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>
            <FormMessage/>
        </FormItem>
    );
};

