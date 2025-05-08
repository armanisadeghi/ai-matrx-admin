"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectAppStep } from "@/features/applet/builder/modules/app-builder/SelectAppStep";
import { AppConfigStep } from "@/features/applet/builder/modules/app-builder/AppConfigStep";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch } from "@/lib/redux";
import { startNewApp } from "@/lib/redux/app-builder/slices/appBuilderSlice";
import { Plus, ListTodo, ChevronLeft, Layers, Boxes } from "lucide-react";
import SimpleTemplateDialog from "@/features/applet/builder/parts/SimpleTemplateDialog";
import ComplexTemplateDialog from "@/features/applet/builder/parts/ComplexTemplateDialog";

interface AppBuilderStartStepProps {
  onAppSelected: (id: string) => void;
  onAppSaved: (appId: string) => void;
  selectedAppId: string | null;
  onUpdateCompletion: (completion: { isComplete: boolean; canProceed: boolean; message?: string }) => void;
}

const AppBuilderStartStep: React.FC<AppBuilderStartStepProps> = ({
  onAppSelected,
  onAppSaved,
  selectedAppId,
  onUpdateCompletion,
}) => {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<"select" | "create" | "choice">("choice");
  const [newAppId, setNewAppId] = useState<string | null>(null);
  const [isSimpleTemplateDialogOpen, setIsSimpleTemplateDialogOpen] = useState(false);
  const [isComplexTemplateDialogOpen, setIsComplexTemplateDialogOpen] = useState(false);
  
  const handleCreateNewApp = () => {
    const newAppId = uuidv4();
    dispatch(startNewApp({ id: newAppId }));
    setNewAppId(newAppId);
    setView("create");
    onUpdateCompletion({ isComplete: false, canProceed: true });
  };

  const handleSelectExisting = () => {
    setView("select");
    onUpdateCompletion({ isComplete: false, canProceed: true });
  };

  const handleBackToChoice = () => {
    setView("choice");
    onUpdateCompletion({ isComplete: false, canProceed: false });
  };

  const handleOpenSimpleTemplateDialog = () => {
    setIsSimpleTemplateDialogOpen(true);
  };

  const handleOpenComplexTemplateDialog = () => {
    setIsComplexTemplateDialogOpen(true);
  };

  const handleAppCreated = (appId: string) => {
    setNewAppId(appId);
    onAppSaved(appId);
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-900 border-none shadow-lg">
      {view === "choice" && (
        <div className="p-8 md:p-12">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
              How would you like to start?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={handleSelectExisting}
                className="cursor-pointer rounded-xl h-64 flex flex-col items-center justify-center space-y-6 p-4 text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <ListTodo className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                <span className="font-medium text-blue-500 dark:text-blue-400">Start From Existing App</span>
              </div>
              
              <div
                onClick={handleCreateNewApp}
                className="cursor-pointer rounded-xl h-64 flex flex-col items-center justify-center space-y-6 p-4 text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Plus className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                <span className="font-medium text-blue-500 dark:text-blue-400">Create New App</span>
              </div>

              <div
                onClick={handleOpenSimpleTemplateDialog}
                className="cursor-pointer rounded-xl h-64 flex flex-col items-center justify-center space-y-6 p-4 text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Layers className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                <span className="font-medium text-blue-500 dark:text-blue-400">Start From Simple Template</span>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                  One Applet, One Container, One Field Only
                </p>
              </div>

              <div
                onClick={handleOpenComplexTemplateDialog}
                className="cursor-pointer rounded-xl h-64 flex flex-col items-center justify-center space-y-6 p-4 text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Boxes className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                <span className="font-medium text-blue-500 dark:text-blue-400">Start From Complex Template</span>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                  Multiple Applets, Multiple Containers, Many Fields
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      )}

      {view === "select" && (
        <div className="p-4">
          <div 
            onClick={handleBackToChoice}
            className="flex items-center mb-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors w-fit"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Back to options</span>
          </div>
          <SelectAppStep
            onAppSelected={onAppSelected}
            onCreateNewApp={handleCreateNewApp}
            selectedAppId={selectedAppId}
            onUpdateCompletion={onUpdateCompletion}
          />
        </div>
      )}

      {view === "create" && (
        <div className="p-4">
          <div 
            onClick={handleBackToChoice}
            className="flex items-center mb-4 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors w-fit"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Back to options</span>
          </div>
          <AppConfigStep
            appId={newAppId}
            onAppSaved={onAppSaved}
            onUpdateCompletion={onUpdateCompletion}
          />
        </div>
      )}

      <SimpleTemplateDialog 
        isOpen={isSimpleTemplateDialogOpen}
        onClose={() => setIsSimpleTemplateDialogOpen(false)}
        onAppCreated={handleAppCreated}
      />

      <ComplexTemplateDialog 
        isOpen={isComplexTemplateDialogOpen}
        onClose={() => setIsComplexTemplateDialogOpen(false)}
        onAppCreated={handleAppCreated}
      />
    </Card>
  );
};

export default AppBuilderStartStep;