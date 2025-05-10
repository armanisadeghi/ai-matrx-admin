"use client";

import { useState } from "react";
import { useDataBrokersWithFetch, useBrokerValuesWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { ALL_BROKER_IDS } from "@/features/applet/depricated-do-not-use-sample-mock-data/constants";
import { MultiBrokerAdder } from "../components/MultiBrokerAdder";
import BrokerSelection from "../components/BrokerSelection";
import HookStatusDisplay from "../components/HookStatusDisplay";
import BrokerValueAssociationTable from "../components/BrokerValueAssociationTable";
import AddedBrokersTable from "../components/AddedBrokersTable";
import DataBrokerRecordsTable from "../components/DataBrokerRecordsTable";
import RawDataDisplay from "../components/RawDataDisplay";
import { useCreateAssociatedValueBrokers } from "@/hooks/applets/useCreateAssociatedValueBrokers";

export default function ValueBrokerTestPage() {
    const [selectedId, setSelectedId] = useState("");
    const [addedBrokers, setAddedBrokers] = useState([]);

    const dataBrokerHook = useDataBrokersWithFetch();
    const brokerValueHook = useBrokerValuesWithFetch();

    const { addBroker, initializedRecords, dataBrokerRecords, isInitialized, brokerToValueAssociation } = useCreateAssociatedValueBrokers({
        dataBrokerHook,
        brokerValueHook,
    });

    const handleAddBroker = () => {
        if (selectedId) {
            addBroker(selectedId);
            setAddedBrokers((prev) => [...prev, selectedId]);
            setSelectedId("");
        }
    };

    const handleAddMultipleBrokers = (brokerIds) => {
        brokerIds.forEach((id) => {
            addBroker(id);
        });
        setAddedBrokers((prev) => [...prev, ...brokerIds]);
    };

    return (
        <div className="p-6 w-full bg-white dark:bg-gray-800 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Value Broker Test Page</h1>

            <BrokerSelection
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                handleAddBroker={handleAddBroker}
                ALL_BROKER_IDS={ALL_BROKER_IDS}
            />

            <MultiBrokerAdder onAddBrokers={handleAddMultipleBrokers} />

            <HookStatusDisplay isInitialized={isInitialized} addedBrokers={addedBrokers}/>

            <BrokerValueAssociationTable brokerToValueAssociation={brokerToValueAssociation} />

            <AddedBrokersTable initializedRecords={initializedRecords} />

            <DataBrokerRecordsTable dataBrokerRecords={dataBrokerRecords} />

            <RawDataDisplay
                initializedRecords={initializedRecords}
                brokerToValueAssociation={brokerToValueAssociation}
                dataBrokerRecords={dataBrokerRecords}
            />
        </div>
    );
}
