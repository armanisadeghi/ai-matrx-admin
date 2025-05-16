// app/demo/broker-field/page.tsx
"use client";

import React from "react";
import { useTempBrokers } from "@/lib/redux/brokerSlice";
import { 
    WithBroker, 
    BrokerField,
    WiredTextInput, 
    WiredNumberInput, 
    WiredToggle, 
    WiredSelect, 
    WiredSlider, 
    WiredDatePicker 
} from "./components/fields";
import { Textarea } from "@/components/ui";
import BrokerDebug from "./components/BrokerDebug";

export default function BrokerFieldDemoPage() {
    // Create temporary brokers for demo
    const tempBrokers = useTempBrokers("demo", 10, {
        itemIdPattern: (i) => {
            const patterns = ["firstName", "lastName", "age", "email", "notifications", "theme", "bio", "volume", "startDate", "country"];
            return patterns[i] || `field-${i}`;
        },
    });

    if (!tempBrokers) {
        return <div className="p-8 text-gray-800 dark:text-gray-200">Loading demo brokers...</div>;
    }

    const brokerMappedItems = {
        firstName: tempBrokers.identifiers[0],
        lastName: tempBrokers.identifiers[1],
        age: tempBrokers.identifiers[2],
        email: tempBrokers.identifiers[3],
        notifications: tempBrokers.identifiers[4],
        theme: tempBrokers.identifiers[5],
        bio: tempBrokers.identifiers[6],
        volume: tempBrokers.identifiers[7],
        startDate: tempBrokers.identifiers[8],
        country: tempBrokers.identifiers[9],
    };

    const themeOptions = [
        { id: "light", label: "Light Theme" },
        { id: "dark", label: "Dark Theme" },
        { id: "auto", label: "System Default" },
    ];

    const countryOptions = [
        { id: "us", label: "United States" },
        { id: "uk", label: "United Kingdom" },
        { id: "ca", label: "Canada" },
        { id: "au", label: "Australia" },
        { id: "de", label: "Germany" },
        { id: "fr", label: "France" },
    ];

    return (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-900 p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">BrokerField Demo</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Column */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6 space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">User Profile Form</h2>

                    {/* Text Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                            <WithBroker brokerMappedItem={brokerMappedItems.firstName} type="text" defaultValue="">
                                <WiredTextInput placeholder="Enter first name" className="w-full" />
                            </WithBroker>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                            <WithBroker brokerMappedItem={brokerMappedItems.lastName} type="text" defaultValue="">
                                <WiredTextInput placeholder="Enter last name" className="w-full" />
                            </WithBroker>
                        </div>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <WithBroker brokerMappedItem={brokerMappedItems.email} type="text" defaultValue="">
                            <WiredTextInput placeholder="email@example.com" className="w-full" />
                        </WithBroker>
                    </div>

                    {/* Number Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                        <WithBroker brokerMappedItem={brokerMappedItems.age} type="number" defaultValue={0}>
                            <WiredNumberInput min={0} max={150} placeholder="Age" />
                        </WithBroker>
                    </div>

                    <hr className="my-6 border-gray-200 dark:border-gray-700" />

                    {/* Select Component */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme Preference</label>
                        <WithBroker brokerMappedItem={brokerMappedItems.theme} type="text" defaultValue="light">
                            <WiredSelect options={themeOptions} placeholder="Choose theme" />
                        </WithBroker>
                    </div>

                    {/* Country Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                        <WithBroker brokerMappedItem={brokerMappedItems.country} type="text" defaultValue="">
                            <WiredSelect options={countryOptions} placeholder="Select country" />
                        </WithBroker>
                    </div>

                    <hr className="my-6 border-gray-200 dark:border-gray-700" />

                    {/* Toggle Component */}
                    <div>
                        <WithBroker brokerMappedItem={brokerMappedItems.notifications} type="boolean" defaultValue={false}>
                            <WiredToggle label="Enable email notifications" />
                        </WithBroker>
                    </div>

                    {/* Slider Component */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volume</label>
                        <WithBroker brokerMappedItem={brokerMappedItems.volume} type="number" defaultValue={50}>
                            <WiredSlider min={0} max={100} step={5} />
                        </WithBroker>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <WithBroker
                            brokerMappedItem={brokerMappedItems.startDate}
                            type="dynamic"
                            transformer={{
                                fromBroker: (value) => (value ? new Date(value) : null),
                                toBroker: (date) => (date ? date.toISOString() : null),
                            }}
                        >
                            <WiredDatePicker
                                minDate={new Date()}
                                maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                            />
                        </WithBroker>
                    </div>

                    {/* Textarea Component */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                        <BrokerField
                            brokerMappedItem={brokerMappedItems.bio}
                            type="text"
                            defaultValue=""
                        >
                            {({ value, onChange, disabled }) => (
                                <Textarea
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    disabled={disabled}
                                    placeholder="Tell us about yourself..."
                                    rows={4}
                                    className="w-full resize-none"
                                />
                            )}
                        </BrokerField>
                    </div>
                </div>

                {/* Debug Column */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6">
                    <div className="sticky top-6">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Live Broker Values</h2>
                        <BrokerDebug brokerMappedItems={brokerMappedItems} />
                    </div>
                </div>
            </div>
        </div>
    );
}
