import React, { useEffect, useState } from "react";
import { ListTodo, AudioLines, MoreHorizontal } from "lucide-react";
import { LuBrainCircuit } from "react-icons/lu";
import { LuBrain } from "react-icons/lu";
import { MdOutlineChecklist } from "react-icons/md";
import { MdOutlineQuestionMark } from "react-icons/md";
import { BsPatchQuestion } from "react-icons/bs";
import { HiOutlineLightBulb } from "react-icons/hi";
import { LiaLightbulbSolid } from "react-icons/lia";
import { TbVariablePlus } from "react-icons/tb";
import { FaFlask } from "react-icons/fa";
import { GiMagnifyingGlass } from "react-icons/gi";
import MobileMenu, { MenuItem } from "./MobileMenu";
import MobileAudioPlan from "./MobileAudioPlan";
import { FileManagerReturn } from "@/hooks/ai/chat/useFileManagement";

interface MatrxMobileMenuProps {
  settings: any;
  updateSettings: (settings: any) => void;
  isDisabled: boolean;
  handleToggleTools: () => void;
  handleToggleBrokers: () => void;
  handleTogglePlan: () => void;
  handleToggleResearch: () => void;
  handleToggleRecipes: () => void;
  fileManager: FileManagerReturn;
  conversationId: string;
}

const MatrxMobileMenu = ({
  settings,
  updateSettings,
  isDisabled,
  handleToggleTools,
  handleToggleBrokers,
  handleTogglePlan,
  handleToggleResearch,
  handleToggleRecipes,
  fileManager,
  conversationId
}: MatrxMobileMenuProps) => {

  const [fileCount, setFileCount] = useState(fileManager.files.length);
  const [isUploading, setIsUploading] = useState(fileManager.isUploading);
  
  useEffect(() => {
    setFileCount(fileManager.files.length);
    setIsUploading(fileManager.isUploading);
  }, [fileManager]);
  
  // Function that creates and returns the submenu component when needed
  // Now properly passes the onClose and onBack functions
  const renderAudioPlanSubmenu = (onClose?: () => void, onBack?: () => void) => {
    
    return (
      <MobileAudioPlan
        fileManager={fileManager}
        fileCount={fileCount}
        isUploading={isUploading}
        conversationId={conversationId}
        onTogglePlan={handleTogglePlan}
        onClose={onClose}
        onBack={onBack}
      />
    );
  };
  
  const menuItems: MenuItem[] = [
    {
      id: "thinking",
      title: "Thinking",
      description: "Enable AI's thinking process",
      icon: <LuBrain />,
      activeIcon: <LuBrainCircuit />,
      inactiveIcon: <LuBrain />,
      type: "toggle",
      enabled: settings.thinkEnabled,
      onToggle: (value) => {
        if (!isDisabled) {
          updateSettings({ thinkEnabled: value });
        }
      }
    },
    {
      id: "structured-plan",
      title: "Structured Plan",
      description: "Show planning steps for complex tasks",
      icon: <MdOutlineChecklist />,
      activeIcon: <ListTodo />,
      inactiveIcon: <MdOutlineChecklist />,
      type: "submenu",
      // Pass proper function signature to match what MobileMenu expects
      renderSubmenu: renderAudioPlanSubmenu
    },
    {
      id: "ask-questions",
      title: "Ask Questions",
      description: "Allow AI to request clarification",
      icon: <MdOutlineQuestionMark />,
      activeIcon: <BsPatchQuestion />,
      inactiveIcon: <MdOutlineQuestionMark />,
      type: "toggle",
      enabled: settings.enableAskQuestions,
      onToggle: (value) => {
        if (!isDisabled) {
          updateSettings({ enableAskQuestions: value });
        }
      }
    },
    {
      id: "information-brokers",
      title: "Information Brokers",
      description: "Add external information sources",
      icon: <TbVariablePlus />,
      activeIcon: <TbVariablePlus />,
      type: "action",
      onClick: () => {
        if (!isDisabled) {
          handleToggleBrokers();
        }
      },
      closeOnClick: true
    },
    {
      id: "research",
      title: "Research",
      description: "Enable in-depth research capabilities",
      icon: <GiMagnifyingGlass />,
      activeIcon: <GiMagnifyingGlass />,
      type: "toggle",
      enabled: settings.researchEnabled,
      onToggle: () => {
        if (!isDisabled) {
          handleToggleResearch();
        }
      }
    },
    {
      id: "recipes",
      title: "Recipes",
      description: "Generate step-by-step processes",
      icon: <FaFlask />,
      activeIcon: <FaFlask />,
      type: "toggle",
      enabled: settings.recipesEnabled,
      onToggle: () => {
        if (!isDisabled) {
          handleToggleRecipes();
        }
      }
    },
    {
      id: "ai-tools",
      title: "AI Tools",
      description: "Enable advanced features and tools",
      icon: <LiaLightbulbSolid />,
      activeIcon: <HiOutlineLightBulb />,
      inactiveIcon: <LiaLightbulbSolid />,
      type: "toggle",
      enabled: settings.toolsEnabled,
      onToggle: () => {
        if (!isDisabled) {
          handleToggleTools();
        }
      },
      closeOnClick: true
    }
  ];

  return (
    <MobileMenu
      triggerIcon={<MoreHorizontal size={20} />}
      title="Settings"
      closeButtonText="Close"
      isDisabled={isDisabled}
      menuItems={menuItems}
    />
  );
};

export default MatrxMobileMenu;