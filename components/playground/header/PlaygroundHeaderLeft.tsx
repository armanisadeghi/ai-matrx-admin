import React from "react";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import PanelToggle from "@/components/matrx/PanelToggle";
import { TbVariablePlus } from "react-icons/tb";
import IconButton from "@/components/matrx/IconButton";
import QuickRefCommandIcon from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefCommandIcon";
import QuickRefMultiSelect from "@/app/entities/quick-reference/QuickRefMultiSelect";

interface PlaygroundHeaderLeftProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
  };
  isLeftCollapsed?: boolean;
  onToggleBrokers?: () => void;
  onVersionChange?: (version: number) => void;
  onHistoryOpen?: () => void;
}

const PlaygroundHeaderLeft = ({
  initialSettings = {},
  isLeftCollapsed,
  onToggleBrokers = () => {},
}: PlaygroundHeaderLeftProps) => {

  const handlePanelToggle = (newIsCollapsed: boolean) => {
    onToggleBrokers();
  };

  const handleRecordChange = (record: QuickReferenceRecord) => {
    // createBroker();
  };

  const createBroker = () => {
    console.log("Placeholder for creating or adding broker");
    // createBroker();
  };

  const handleRecordsChange = (records: QuickReferenceRecord[]) => {
    records.forEach((record) => {
      console.log("Placeholder for creating or adding broker got record:", record)
      // createBroker();
    });
  }

  return (
    <div className="flex w-full items-center pl-4 space-x-1">
      <PanelToggle
        size={24}
        side="left"
        isCollapsed={isLeftCollapsed}
        onToggle={handlePanelToggle}
        panelName="Brokers Panel"
        useInternalState={false}
      />
      {/* <IconButton
        icon={TbVariablePlus}
        onClick={createBroker}
        size={24}
        title="Create New Broker"
        ariaLabel="Create new broker"
      /> */}
      {/* <QuickRefCommandIcon
        entityKey={"dataBroker"}
        onRecordChange={handleRecordChange}
        title="Add Item"
        size={22}
        disabled={false}
      />
      <QuickRefMultiSelect
        entityKey={"dataBroker"}
        onRecordsChange={handleRecordsChange}
        fetchMode="fkIfk"
      /> */}
    </div>
  );
};

export default PlaygroundHeaderLeft;
