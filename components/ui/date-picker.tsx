import React, {useState} from 'react';
import {CalendarIcon} from "lucide-react";
import {format} from "date-fns";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {DateRange} from "react-day-picker";

interface DatePickerProps {
    onChange: (date: Date | undefined) => void;
    value?: Date;
    placeholder?: string;
    className?: string;
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    formatString?: string;
    calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>;
}

export const DatePicker: React.FC<DatePickerProps> = (
    {
        onChange,
        value,
        placeholder = "Pick a date",
        className = "",
        buttonVariant = "outline",
        formatString = "PPP",
        calendarProps = {},
    }) => {
    const [date, setDate] = useState<Date | undefined>(value);

    const handleDateSelect = (newDate: Date | DateRange | undefined) => {
        if (newDate instanceof Date) {
            setDate(newDate);
            onChange(newDate);
        }
    };

    const formatDate = (date: Date, formatString: string) => {
        try {
            return format(date, formatString);
        } catch (error) {
            console.error("Invalid date format string:", formatString);
            return format(date, "PPP"); // Fallback format
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={buttonVariant}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4"/>
                    {date ? formatDate(date, formatString) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                    {...calendarProps}
                />
            </PopoverContent>
        </Popover>
    );
};

// Usage example:
export const DatePickerExample: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date>();

    return (
        <DatePicker
            onChange={setSelectedDate}
            value={selectedDate}
            placeholder="Select event date"
            className="w-[300px]"
            buttonVariant="secondary"
            formatString="dd/MM/yyyy"
        />
    );
};
const data = {
    "records": [
        {
            "primaryKeyValues": {
                "flashcard_id": "12b92eac-7200-40ba-ade2-5d4d9924fe84",
                "set_id": "f34c2510-1b43-4d4b-b91a-c274d024e7c6"
            },
            "displayValue": "12b92eac-7200-40ba-ade2-5d4d9924fe84",
            "recordKey": "flashcard_id:undefined::set_id:undefined"
        },
        {
            "primaryKeyValues": {
                "flashcard_id": "758e5508-9ca5-4bc5-91a3-2f8e1460d718",
                "set_id": "f34c2510-1b43-4d4b-b91a-c274d024e7c6"
            },
            "displayValue": "758e5508-9ca5-4bc5-91a3-2f8e1460d718",
            "recordKey": "flashcard_id:undefined::set_id:undefined"
        },
        {
            "primaryKeyValues": {
                "flashcard_id": "8e22ec07-4ec7-446a-bd05-c81791782c67",
                "set_id": "f34c2510-1b43-4d4b-b91a-c274d024e7c6"
            },
            "displayValue": "8e22ec07-4ec7-446a-bd05-c81791782c67",
            "recordKey": "flashcard_id:undefined::set_id:undefined"
        }
    ],
    "lastUpdated": "2024-11-13T00:56:05.582Z",
    "totalAvailable": 0,
    "fetchComplete": true
}

const data2 = {
    "flashcard_id:12b92eac-7200-40ba-ade2-5d4d9924fe84::set_id:f34c2510-1b43-4d4b-b91a-c274d024e7c6": {
        "flashcardId": "12b92eac-7200-40ba-ade2-5d4d9924fe84",
        "setId": "f34c2510-1b43-4d4b-b91a-c274d024e7c6",
        "order": null
    },
    "flashcard_id:758e5508-9ca5-4bc5-91a3-2f8e1460d718::set_id:f34c2510-1b43-4d4b-b91a-c274d024e7c6": {
        "flashcardId": "758e5508-9ca5-4bc5-91a3-2f8e1460d718",
        "setId": "f34c2510-1b43-4d4b-b91a-c274d024e7c6",
        "order": 2
    }
}

const data3 = {
    "record": {
        "flashcard_id": "8e22ec07-4ec7-446a-bd05-c81791782c67",
        "set_id": "f34c2510-1b43-4d4b-b91a-c274d024e7c6"
    }
}

const data4 = {
    "metadata": {
        "type": "composite",
        "fields": [
            "flashcardId",
            "setId"
        ],
        "database_fields": [
            "flashcard_id",
            "set_id"
        ],
        "where_template": {
            "flashcard_id": null,
            "set_id": null
        }
    }
}

const data5 = {
    "record": {
        "flashcardId": "758e5508-9ca5-4bc5-91a3-2f8e1460d718",
        "setId": "f34c2510-1b43-4d4b-b91a-c274d024e7c6",
        "order": 2
    }
}

const data6 = {
    "metadata": {
        "type": "composite",
        "fields": [
            "flashcardId",
            "setId"
        ],
        "database_fields": [
            "flashcard_id",
            "set_id"
        ],
        "where_template": {
            "flashcard_id": null,
            "set_id": null
        }
    }
}
