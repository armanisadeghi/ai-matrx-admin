import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
    brokerConceptSelectors,
    setBrokerOptionsConcept as setBrokerOptions,
    selectOptionConcept as selectOption,
    deselectOptionConcept as deselectOption,
    updateOptionPropertiesConcept as updateOptionProperties,
    BrokerIdentifier,
} from "@/lib/redux/app-runner/slices/brokerSliceConcept";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDefinition } from "@/types/customAppTypes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchableSelectFieldProps {
    field: FieldDefinition;
    appletId: string;
    source?: string;
    isMobile?: boolean;
    disabled?: boolean;
}

const SearchableSelectFieldConcept: React.FC<SearchableSelectFieldProps> = ({
    field,
    appletId,
    source = "applet",
    isMobile,
    disabled = false,
}) => {
    const { id, label, placeholder, options, componentProps, includeOther } = field;
    const { width, customContent } = componentProps;
    const safeWidthClass = ensureValidWidthClass(width);

    const dispatch = useAppDispatch();
    const idArgs: BrokerIdentifier = { source, sourceId: appletId, itemId: id };
    const brokerOptions = useAppSelector((state) => brokerConceptSelectors.selectBrokerOptions(state, idArgs));
    const selectedOptions = useAppSelector((state) => brokerConceptSelectors.selectSelectedBrokerOptions(state, idArgs));
    const otherOption = useAppSelector((state) => brokerConceptSelectors.selectBrokerOptionById(state, idArgs, "other"));

    // UI-only state for search query
    const [searchQuery, setSearchQuery] = useState("");
    const filteredOptions = useAppSelector((state) => brokerConceptSelectors.selectFilteredBrokerOptions(state, idArgs, searchQuery));

    // Initialize options if not set
    useEffect(() => {
        if (!brokerOptions && options?.length > 0) {
            const initialOptions = options.map((option) => ({
                id: option.id,
                label: option.label,
                description: option.description,
                helpText: option.helpText,
                iconName: option.iconName,
            }));
            if (includeOther) {
                initialOptions.push({
                    id: "other",
                    label: "Other",
                    description: "",
                    helpText: "",
                    iconName: "",
                });
            }
            dispatch(
                setBrokerOptions({
                    idArgs,
                    options: initialOptions,
                })
            );
        }
    }, [brokerOptions, options, includeOther, dispatch, idArgs]);

    // Handle option selection (single selection)
    const handleSelectChange = (optionId: string) => {
        // Deselect current selection (if any)
        selectedOptions.forEach((opt) => {
            if (opt.id !== optionId) {
                dispatch(deselectOption({ idArgs, optionId: opt.id }));
            }
        });
        // Select new option
        dispatch(selectOption({ idArgs, optionId }));
        setSearchQuery("");
    };

    // Handle "Other" text input
    const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const otherText = e.target.value;
        dispatch(
            updateOptionProperties({
                idArgs,
                optionId: "other",
                properties: { otherText, isSelected: true },
            })
        );
    };

    // Render custom content if provided
    if (customContent) {
        return <>{customContent}</>;
    }

    // Determine selected option (single selection)
    const selectedOption = selectedOptions[0] || null;
    const isOtherSelected = selectedOption?.id === "other";

    return (
        <div className={safeWidthClass}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                        disabled={disabled}
                    >
                        {selectedOption?.label || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-full p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    align="start"
                    sideOffset={5}
                >
                    <div className="flex flex-col">
                        <div className="flex items-center border-b p-2">
                            <Input
                                placeholder="Search options..."
                                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-700 dark:text-gray-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="h-72 max-h-[60vh]">
                            <div className="p-1">
                                {filteredOptions.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No options found.</div>
                                ) : (
                                    filteredOptions.map((option) => (
                                        <div
                                            key={option.id}
                                            className={cn(
                                                "flex items-center relative cursor-default select-none py-1.5 px-2 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700",
                                                selectedOption?.id === option.id && "bg-gray-100 dark:bg-gray-700"
                                            )}
                                            onClick={() => handleSelectChange(option.id)}
                                            role="option"
                                            aria-selected={selectedOption?.id === option.id}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    handleSelectChange(option.id);
                                                }
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedOption?.id === option.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span>{option.label}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>
            {isOtherSelected && (
                <Input
                    id={`${appletId}-${id}-other-input`}
                    className="w-full mt-2 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                    value={otherOption?.otherText || ""}
                    onChange={handleOtherTextChange}
                    placeholder="Please specify..."
                    disabled={disabled}
                />
            )}
        </div>
    );
};

export default SearchableSelectFieldConcept;
