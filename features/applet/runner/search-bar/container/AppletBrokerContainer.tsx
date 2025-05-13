// features\applet\runner\components\search-bar\container\AppletBrokerContainer.tsx
import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopAppletBrokerContainer from './DesktopAppletBrokerContainer';
import MobileAppletBrokerContainer from './MobileAppletBrokerContainer';

interface AppletBrokerContainerProps {
  children: React.ReactNode;
  activeContainerId?: string | null;
  onActiveContainerChange?: (id: string | null) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const AppletBrokerContainer: React.FC<AppletBrokerContainerProps> = (props) => {
  const isMobile = useIsMobile();
  
  // Conditionally render either the mobile or desktop version
  return isMobile ? (
    <MobileAppletBrokerContainer
      activeContainerId={props.activeContainerId}
      setActiveContainerId={props.onActiveContainerChange}
      actionButton={props.actionButton}
      className={props.className}
      children={props.children}
    />
  ) : (
    <DesktopAppletBrokerContainer
      activeContainerId={props.activeContainerId}
      setActiveContainerId={props.onActiveContainerChange}
      actionButton={props.actionButton}
      className={props.className}
      children={props.children}
    />
  );
};

export default AppletBrokerContainer;