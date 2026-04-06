// state-analyzer/StateViewerOverlay.tsx
import React from "react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import type { RootState } from "@/lib/redux/store";
import { useAppStore } from "@/lib/redux/hooks";
import { getStateViewerTabs } from "./stateViewerTabs";

interface StateViewerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Custom hook to get the entire Redux state without triggering warnings
 * This is only used for debugging purposes
 */
const useCompleteState = (): RootState => {
  const store = useAppStore();
  // Get the state directly from the store instead of using useSelector
  return store.getState();
};

const StateViewerOverlay: React.FC<StateViewerOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const completeState = useCompleteState();
  const tabs = getStateViewerTabs(completeState);

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description="View the current Redux state of the application"
      tabs={tabs}
      width="95vw"
      height="95vh"
      compactTabs={true}
    />
  );
};

export default StateViewerOverlay;
