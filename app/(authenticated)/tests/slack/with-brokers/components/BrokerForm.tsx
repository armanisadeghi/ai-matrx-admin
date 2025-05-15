// components/BrokerForm.tsx
"use client";

import { brokerConceptSelectors, BrokerIdentifier, brokerConceptActions, useServerBrokerSync } from "@/lib/redux/brokerSlice";
import { useAppSelector, useAppDispatch } from "@/lib/redux";

// Define broker identifiers
const BROKER_IDS = {
  token: { source: 'api', itemId: 'slack_token' },
  channels: { source: 'slack', itemId: 'slack_channels' },
  filename: { source: 'slack', itemId: 'slack_filename' },
  title: { source: 'slack', itemId: 'slack_title' },
  initialComment: { source: 'slack', itemId: 'slack_initial_comment' },
} as const;

interface BrokerFormConfig {
    fields: {
        broker: BrokerIdentifier;
        label: string;
        type: "text" | "password" | "textarea" | "number";
        required?: boolean;
    }[];
    onSubmit: (values: Record<string, any>) => Promise<void>;
    brokerSync?: boolean;
}

export function BrokerForm({ fields, onSubmit, brokerSync = true }: BrokerFormConfig) {
    const dispatch = useAppDispatch();

    // Get all field values
    const values = useAppSelector((state) => {
        const fieldValues: Record<string, any> = {};
        fields.forEach((field) => {
            const key = JSON.stringify(field.broker);
            fieldValues[key] = brokerConceptSelectors.selectValue(state, field.broker);
        });
        return fieldValues;
    });

    // Sync to server if enabled
    if (brokerSync) {
        useServerBrokerSync({
            brokers: fields.map((f) => f.broker),
            syncOnChange: true,
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const submitValues: Record<string, any> = {};
        fields.forEach((field) => {
            const key = JSON.stringify(field.broker);
            submitValues[field.label] = values[key];
        });

        await onSubmit(submitValues);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field, index) => {
                const key = JSON.stringify(field.broker);
                const value = values[key] || "";

                return (
                    <div key={index} className="space-y-1">
                        <label className="text-slate-800 dark:text-slate-200">{field.label}:</label>
                        {field.type === "textarea" ? (
                            <textarea
                                value={value as string}
                                onChange={(e) =>
                                    dispatch(
                                        brokerConceptActions.setText({
                                            idArgs: field.broker,
                                            text: e.target.value,
                                        })
                                    )
                                }
                                required={field.required}
                                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                            />
                        ) : (
                            <input
                                type={field.type}
                                value={field.type === "number" ? (value as number) : (value as string)}
                                onChange={(e) => {
                                    if (field.type === "number") {
                                        const numValue = Number(e.target.value);
                                        dispatch(
                                            brokerConceptActions.setNumber({
                                                idArgs: field.broker,
                                                value: numValue,
                                            })
                                        );
                                    } else {
                                        dispatch(
                                            brokerConceptActions.setText({
                                                idArgs: field.broker,
                                                text: e.target.value,
                                            })
                                        );
                                    }
                                }}
                                required={field.required}
                                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                            />
                        )}
                    </div>
                );
            })}

            <button 
                type="submit" 
                className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors"
            >
                Submit
            </button>
        </form>
    );
}

export function BrokerFormExample() {
    return (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Slack Upload with Brokers</h2>
            <BrokerForm
                fields={[
                    { broker: BROKER_IDS.token, label: "Slack Token", type: "password", required: true },
                    { broker: BROKER_IDS.channels, label: "Channel ID", type: "text", required: true },
                    { broker: BROKER_IDS.title, label: "Title", type: "text" },
                    { broker: BROKER_IDS.initialComment, label: "Comment", type: "textarea" },
                ]}
                onSubmit={async (values) => {
                    console.log("Form submitted with broker values", values);
                    alert("Form submitted! Check console for values.");
                }}
            />
        </div>
    );
}
