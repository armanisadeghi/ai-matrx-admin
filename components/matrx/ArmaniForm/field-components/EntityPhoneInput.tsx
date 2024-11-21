'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Check, Phone } from 'lucide-react'
import {
    parsePhoneNumberFromString,
    isValidPhoneNumber,
    getCountries,
    getCountryCallingCode,
    CountryCode,
} from 'libphonenumber-js';
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export interface EntityPhoneInputProps {
    field: {
        value: string
        onChange: (value: string) => void
        onBlur?: () => void
        name: string
    }
    componentProps?: {
        label?: string
        placeholder?: string
        required?: boolean
        disabled?: boolean
        className?: string
        defaultCountry?: CountryCode
        allowInternational?: boolean
        showCountrySelect?: boolean
        showFormatHint?: boolean
        showValidationState?: boolean
    }
}

const COMMON_COUNTRIES: CountryCode[] = [
    'US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'JP', 'CN', 'IN'
];

interface CountryData {
    code: CountryCode;
    name: string;
    flag: string;
    format: string;
}

const COUNTRY_DATA: Record<string, CountryData> = {
    US: {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        format: '(XXX) XXX-XXXX'
    },
    CA: {
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
        format: '(XXX) XXX-XXXX'
    },
    GB: {
        code: 'GB',
        name: 'United Kingdom',
        flag: '🇬🇧',
        format: 'XXXX XXXXXX'
    },
    AU: {
        code: 'AU',
        name: 'Australia',
        flag: '🇦🇺',
        format: 'XXXX XXX XXX'
    },
    FR: {
        code: 'FR',
        name: 'France',
        flag: '🇫🇷',
        format: 'XX XX XX XX XX'
    },
    DE: {
        code: 'DE',
        name: 'Germany',
        flag: '🇩🇪',
        format: 'XXXX XXXXXXX'
    },
    IT: {
        code: 'IT',
        name: 'Italy',
        flag: '🇮🇹',
        format: 'XXX XXXXXXX'
    },
    ES: {
        code: 'ES',
        name: 'Spain',
        flag: '🇪🇸',
        format: 'XXX XXX XXX'
    },
    JP: {
        code: 'JP',
        name: 'Japan',
        flag: '🇯🇵',
        format: 'XX-XXXX-XXXX'
    },
    CN: {
        code: 'CN',
        name: 'China',
        flag: '🇨🇳',
        format: 'XXX XXXX XXXX'
    },
    IN: {
        code: 'IN',
        name: 'India',
        flag: '🇮🇳',
        format: 'XXXXX-XXXXX'
    }
};

export function EntityPhoneInput({ field, componentProps }: EntityPhoneInputProps) {
    const {
        label,
        placeholder = 'Enter phone number',
        required = false,
        disabled = false,
        className,
        defaultCountry = 'US' as CountryCode,
        allowInternational = true,
        showCountrySelect = true,
        showFormatHint = true,
        showValidationState = true,
    } = componentProps || {}

    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry)
    const [displayValue, setDisplayValue] = useState('')
    const [isValid, setIsValid] = useState(false)
    const [error, setError] = useState<string>('')

    // Get all available countries
    const countries = getCountries()
        .map(code => ({
            code: code as CountryCode,
            name: new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code,
            flag: COUNTRY_DATA[code]?.flag || '🏳️',
            format: COUNTRY_DATA[code]?.format || 'XXXXXXXXXX',
            common: COMMON_COUNTRIES.includes(code as CountryCode)
        }))
        .sort((a, b) => {
            // Sort common countries first, then alphabetically
            if (a.common && !b.common) return -1
            if (!a.common && b.common) return 1
            return a.name.localeCompare(b.name)
        })

    useEffect(() => {
        if (field.value) {
            try {
                const phoneNumber = parsePhoneNumberFromString(field.value, selectedCountry);
                if (phoneNumber) {
                    setDisplayValue(phoneNumber.formatNational());
                    setIsValid(isValidPhoneNumber(field.value, selectedCountry));
                }
            } catch (e) {
                setDisplayValue(field.value)
                setIsValid(false)
            }
        } else {
            setDisplayValue('')
            setIsValid(false)
        }
    }, [field.value, selectedCountry])

    const formatPhoneNumberInput = (input: string, country: CountryCode): string => {
        try {
            const phoneNumber = parsePhoneNumberFromString(input, country);
            return phoneNumber ? phoneNumber.formatNational() : input;
        } catch (e) {
            return input;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value
        const formattedInput = formatPhoneNumberInput(input, selectedCountry)
        setDisplayValue(formattedInput)

        try {
            const phoneNumber = parsePhoneNumberFromString(input, selectedCountry);
            if (phoneNumber) {
                const formatted = phoneNumber.format('E.164');
                field.onChange(formatted);
                setIsValid(isValidPhoneNumber(formatted, selectedCountry));
                setError('');
            } else {
                field.onChange(input);
                setIsValid(false);
                setError('Invalid phone number format');
            }
        } catch (e) {
            field.onChange(input);
            setIsValid(false);
            setError('Invalid phone number');
        }
    }

    const handleCountryChange = (country: CountryCode) => {
        setSelectedCountry(country)
        setDisplayValue('')
        field.onChange('')
        setIsValid(false)
        setError('')
    }

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium">
                    {label}
                    {required && <span className="text-destructive">*</span>}
                </label>
            )}

            <div className="flex space-x-2">
                {showCountrySelect && (
                    <Select
                        value={selectedCountry}
                        onValueChange={(value) => handleCountryChange(value as CountryCode)}
                        disabled={disabled}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue>
                                <div className="flex items-center space-x-2">
                                    <span>{COUNTRY_DATA[selectedCountry]?.flag || '🏳️'}</span>
                                    <span>+{getCountryCallingCode(selectedCountry)}</span>
                                </div>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map((country) => (
                                <SelectItem
                                    key={country.code}
                                    value={country.code}
                                    className={cn(
                                        "flex items-center space-x-2",
                                        !country.common && "opacity-70"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center space-x-2">
                                            <span>{country.flag}</span>
                                            <span>{country.name}</span>
                                        </div>
                                        <span className="text-muted-foreground text-sm">
                                            +{getCountryCallingCode(country.code)}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <div className="relative flex-1">
                    <Input
                        type="tel"
                        value={displayValue}
                        onChange={handleChange}
                        onBlur={field.onBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={cn(
                            "pl-10",
                            error && "border-destructive",
                            isValid && "border-green-500",
                            className
                        )}
                    />
                    <Phone className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    {showValidationState && (
                        <div className="absolute right-3 top-3">
                            {isValid && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                    )}
                </div>
            </div>

            {showFormatHint && COUNTRY_DATA[selectedCountry]?.format && (
                <p className="text-sm text-muted-foreground">
                    Format: {COUNTRY_DATA[selectedCountry].format}
                </p>
            )}

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    )
}
