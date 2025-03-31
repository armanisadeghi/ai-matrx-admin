import React, { useState } from "react";
import { ListTodo, MoreHorizontal, X } from "lucide-react";
import { LuBrainCircuit } from "react-icons/lu";
import { LuBrain } from "react-icons/lu";
import { MdOutlineChecklist } from "react-icons/md";
import { MdOutlineQuestionMark } from "react-icons/md";
import { BsPatchQuestion } from "react-icons/bs";
import { HiOutlineLightBulb } from "react-icons/hi";
import { LiaLightbulbSolid } from "react-icons/lia";

interface MobileMenuProps {
  settings: any;
  updateSettings: (settings: any) => void;
  isDisabled: boolean;
  handleToggleTools: () => void;
}

const MobileMenu = ({ settings, updateSettings, isDisabled, handleToggleTools }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  return (
    <div className="relative">
      <button
        className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
        onClick={toggleMenu}
      >
        <MoreHorizontal size={20} />
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-800 z-50 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-300 dark:border-zinc-700">
            <h2 className="text-lg font-medium">Settings</h2>
            <button 
              className="p-2 rounded-full text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              onClick={toggleMenu}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Menu items */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="flex flex-col space-y-4 px-4">
              {/* Thinking */}
              <div 
                className="flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"
                onClick={() => {
                  updateSettings({ thinkEnabled: !settings.thinkEnabled });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {settings.thinkEnabled ? <LuBrainCircuit /> : <LuBrain />}
                  </div>
                  <div>
                    <div className="font-medium">Thinking</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Enable AI's thinking process
                    </div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${settings.thinkEnabled ? 'bg-green-500' : 'bg-zinc-400'}`}></div>
              </div>
              
              {/* Structured Plan */}
              <div 
                className="flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"
                onClick={() => {
                  updateSettings({ planEnabled: !settings.planEnabled });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {settings.planEnabled ? <ListTodo /> : <MdOutlineChecklist />}
                  </div>
                  <div>
                    <div className="font-medium">Structured Plan</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Show planning steps for complex tasks
                    </div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${settings.planEnabled ? 'bg-green-500' : 'bg-zinc-400'}`}></div>
              </div>
              
              {/* Ask Questions */}
              <div 
                className="flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"
                onClick={() => {
                  updateSettings({ enableAskQuestions: !settings.enableAskQuestions });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {settings.enableAskQuestions ? <BsPatchQuestion /> : <MdOutlineQuestionMark />}
                  </div>
                  <div>
                    <div className="font-medium">Ask Questions</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Allow AI to request clarification
                    </div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${settings.enableAskQuestions ? 'bg-green-500' : 'bg-zinc-400'}`}></div>
              </div>
              
              {/* AI Tools */}
              <div 
                className="flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"
                onClick={() => {
                  handleToggleTools();
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {settings.toolsEnabled ? <HiOutlineLightBulb /> : <LiaLightbulbSolid />}
                  </div>
                  <div>
                    <div className="font-medium">AI Tools</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Enable advanced features and tools
                    </div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${settings.toolsEnabled ? 'bg-green-500' : 'bg-zinc-400'}`}></div>
              </div>
              
              {/* Add more menu items here */}
              {/* Example of a new menu item */}
              <div 
                className="flex items-center justify-between p-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600"
                onClick={() => {
                  // Your action here
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">
                    {/* Icon here */}
                    <BsPatchQuestion />
                  </div>
                  <div>
                    <div className="font-medium">New Feature</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Description of the new feature
                    </div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full bg-zinc-400`}></div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-zinc-300 dark:border-zinc-700">
            <button
              className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              onClick={toggleMenu}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu