import React, { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { brokerSelectors, brokerActions } from "@/lib/redux/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldDefinition } from "@/types/customAppTypes";

// Interface for address data
interface AddressData {
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

// Common countries list
const COMMON_COUNTRIES = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
    { code: "AU", name: "Australia" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "IN", name: "India" },
    { code: "BR", name: "Brazil" },
    { code: "MX", name: "Mexico" },
    // Add more common countries as needed
];

const AddressBlockField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string; // Add this new prop
}> = ({ field, appletId, isMobile, source = "applet", disabled = false, className = "" }) => {
    const { id, label, componentProps, required } = field;

    const { width, customContent } = componentProps;

    const safeWidthClass = ensureValidWidthClass(width);

    const dispatch = useAppDispatch();
    const brokerId = useAppSelector((state) => brokerSelectors.selectBrokerId(state, { source, mappedItemId: id }));
    const stateValue = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));

    const updateBrokerValue = useCallback(
        (updatedValue: any) => {
            dispatch(
                brokerActions.setValue({
                    brokerId,
                    value: updatedValue,
                })
            );
        },
        [dispatch, brokerId]
    );

    // Local state for address fields
    const [address, setAddress] = useState<AddressData>({
        address1: "",
        address2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US", // Default to US
    });

    // Track field touched state to show validation errors only after interaction
    const [touched, setTouched] = useState({
        address1: false,
        city: false,
        state: false,
        postalCode: false,
        country: false,
    });

    // Initialize address from state value
    useEffect(() => {
        if (stateValue) {
            setAddress((prevAddress) => ({
                ...prevAddress,
                ...stateValue,
            }));
        } else if (field.defaultValue) {
            setAddress((prevAddress) => ({
                ...prevAddress,
                ...field.defaultValue,
            }));

            // Update state with default value
            updateBrokerValue({
                brokerId,
                value: {
                    ...address,
                    ...field.defaultValue,
                },
            });
        }
    }, [dispatch, field.defaultValue, id, stateValue, updateBrokerValue]);

    // Update address field and sync with state
    const handleAddressChange = (field: keyof AddressData, value: string) => {
        if (disabled) return;

        const updatedAddress = {
            ...address,
            [field]: value,
        };

        setAddress(updatedAddress);
        setTouched((prev) => ({
            ...prev,
            [field]: true,
        }));

        // Update state
        updateBrokerValue(updatedAddress);
    };

    // Handle blur event for a field
    const handleBlur = (field: keyof AddressData) => {
        setTouched((prev) => ({
            ...prev,
            [field]: true,
        }));
    };

    // Check validation for required fields
    const getFieldError = (field: keyof AddressData) => {
        if (required && touched[field as keyof typeof touched] && !address[field]) {
            return `${field === "address1" ? "Address" : field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }
        return null;
    };

    // Check if any required field is empty
    const hasValidationError =
        required && (!address.address1 || !address.city || !address.state || !address.postalCode || !address.country);

    // Render custom content if provided
    if (customContent) {
        return <>{customContent}</>;
    }

    return (
        <div className={`${safeWidthClass} ${className}`}>
            <div className="space-y-3">
                {/* Address Line 1 */}
                <div>
                    <Input
                        id={`${id}-address1`}
                        placeholder="Address Line 1"
                        value={address.address1}
                        onChange={(e) => handleAddressChange("address1", e.target.value)}
                        onBlur={() => handleBlur("address1")}
                        disabled={disabled}
                        className={cn(
                            "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                            getFieldError("address1") && "border-red-500"
                        )}
                    />
                    {getFieldError("address1") && <div className="text-red-500 text-xs mt-1">{getFieldError("address1")}</div>}
                </div>

                {/* Address Line 2 */}
                <div>
                    <Input
                        id={`${id}-address2`}
                        placeholder="Address Line 2 (Optional)"
                        value={address.address2}
                        onChange={(e) => handleAddressChange("address2", e.target.value)}
                        disabled={disabled}
                        className="focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                    />
                </div>

                {/* City, State/Province, Postal Code row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* City */}
                    <div>
                        <Input
                            id={`${id}-city`}
                            placeholder="City"
                            value={address.city}
                            onChange={(e) => handleAddressChange("city", e.target.value)}
                            onBlur={() => handleBlur("city")}
                            disabled={disabled}
                            className={cn(
                                "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                                getFieldError("city") && "border-red-500"
                            )}
                        />
                        {getFieldError("city") && <div className="text-red-500 text-xs mt-1">{getFieldError("city")}</div>}
                    </div>

                    {/* State/Province */}
                    <div>
                        <Input
                            id={`${id}-state`}
                            placeholder="State / Province / Region"
                            value={address.state}
                            onChange={(e) => handleAddressChange("state", e.target.value)}
                            onBlur={() => handleBlur("state")}
                            disabled={disabled}
                            className={cn(
                                "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                                getFieldError("state") && "border-red-500"
                            )}
                        />
                        {getFieldError("state") && <div className="text-red-500 text-xs mt-1">{getFieldError("state")}</div>}
                    </div>

                    {/* Postal Code / ZIP */}
                    <div>
                        <Input
                            id={`${id}-postalCode`}
                            placeholder="ZIP / Postal Code"
                            value={address.postalCode}
                            onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                            onBlur={() => handleBlur("postalCode")}
                            disabled={disabled}
                            className={cn(
                                "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                                getFieldError("postalCode") && "border-red-500"
                            )}
                        />
                        {getFieldError("postalCode") && <div className="text-red-500 text-xs mt-1">{getFieldError("postalCode")}</div>}
                    </div>
                </div>

                {/* Country */}
                <div>
                    <Select value={address.country} onValueChange={(value) => handleAddressChange("country", value)} disabled={disabled}>
                        <SelectTrigger
                            className={cn(
                                "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
                                getFieldError("country") && "border-red-500"
                            )}
                        >
                            <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {COMMON_COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {getFieldError("country") && <div className="text-red-500 text-xs mt-1">{getFieldError("country")}</div>}
                </div>
            </div>

            {/* Overall validation message - only show if form has been interacted with */}
            {required && hasValidationError && Object.values(touched).some((t) => t) && (
                <div className="text-red-500 text-sm mt-2">Please fill in all required address fields.</div>
            )}
        </div>
    );
};

export default AddressBlockField;
