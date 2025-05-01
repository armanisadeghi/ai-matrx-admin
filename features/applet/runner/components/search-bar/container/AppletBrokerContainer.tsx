// features\applet\runner\components\search-bar\container\AppletBrokerContainer.tsx
import React from 'react';
import { useAppletData } from "@/context/AppletDataContext";
import DesktopAppletBrokerContainer from './DesktopAppletBrokerContainer';
import MobileAppletBrokerContainer from './MobileAppletBrokerContainer';

interface AppletBrokerContainerProps {
  children: React.ReactNode;
  activeFieldId?: string | null;
  onActiveFieldChange?: (id: string | null) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const AppletBrokerContainer: React.FC<AppletBrokerContainerProps> = (props) => {
  const { isMobile } = useAppletData();
  
  // Conditionally render either the mobile or desktop version
  return isMobile ? (
    <MobileAppletBrokerContainer {...props} />
  ) : (
    <DesktopAppletBrokerContainer {...props} />
  );
};

export default AppletBrokerContainer;