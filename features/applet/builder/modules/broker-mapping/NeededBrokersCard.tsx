"use client";
import React, { useEffect } from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeededBrokerCount,
  selectMappedBrokerCount,
  selectSortedNeededBrokers,
  selectBrokerMappingCompletionPercentage,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { Broker, AppletSourceConfig } from "@/features/applet/builder/builder.types";
import { CheckCircle2, GaugeCircle, PieChart } from "lucide-react";
import BrokerCard from "./BrokerCard";

interface NeededBrokersCardProps {
    appletId: string;
    sourceConfig: AppletSourceConfig | null;
    selectedBroker: Broker | null;
    onBrokerSelect: (broker: Broker) => void;
}

const NeededBrokersCard = ({ appletId, sourceConfig, selectedBroker, onBrokerSelect }: NeededBrokersCardProps) => {
    const neededBrokerCount = useAppSelector((state) => selectNeededBrokerCount(state, appletId));
    const mappedBrokerCount = useAppSelector((state) => selectMappedBrokerCount(state, appletId));
    const sortedBrokers = useAppSelector((state) => selectSortedNeededBrokers(state, appletId));
    const completionPercentage = useAppSelector((state) => selectBrokerMappingCompletionPercentage(state, appletId));
  
    useEffect(() => {
        if (sortedBrokers?.[0]) {
            onBrokerSelect(sortedBrokers?.[0]);
        }
    }, [sortedBrokers]);


    const getDescription = () => {
      const isMappingComplete = mappedBrokerCount === neededBrokerCount && neededBrokerCount > 0;
      const hasNoNeededBrokers = neededBrokerCount === 0;

      return (
        <div className="flex items-center justify-between mb-0">
            <div className="flex items-center">
                {isMappingComplete ? (
                    <>
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">All Brokers Mapped</span>
                    </>
                ) : hasNoNeededBrokers ? (
                    <>
                        <CheckCircle2 className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-400">No Brokers Required</span>
                    </>
                ) : (
                    <>
                        <GaugeCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 mr-2" />
                        <span className="text-sm font-medium text-amber-500 dark:text-amber-400">
                            {completionPercentage}% Complete ({mappedBrokerCount}/{neededBrokerCount})
                        </span>
                    </>
                )}
            </div>
            <PieChart className={`w-5 h-5 ${
                isMappingComplete ? "text-green-600 dark:text-green-400" : 
                hasNoNeededBrokers ? "text-gray-400" : 
                "text-amber-500 dark:text-amber-400"
            }`} />
        </div>
      );
    };
  
    if (!sourceConfig) return null;
    
    return (
        <SectionCard
            title="Needed Brokers"
            descriptionNode={getDescription()}
            color="gray"
            minHeight="960px"
            maxHeight="960px"
            scrollable={true}
        >
            <div className="py-3 px-1 space-y-3">
                {sortedBrokers.map((broker) => (
                    <BrokerCard
                        key={broker.id}
                        broker={broker}
                        appletId={appletId}
                        isSelected={selectedBroker?.id === broker.id}
                        onSelect={onBrokerSelect}
                    />
                ))}
            </div>
        </SectionCard>
    );
};

export default NeededBrokersCard;
