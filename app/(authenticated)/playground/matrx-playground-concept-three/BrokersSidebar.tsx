'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVariablesStore } from "@/app/(authenticated)/tests/recipe-creation/brokers-two/hooks/useVariablesStore";
import { Button } from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import BrokerEditor from "./BrokerEditor";

export default function BrokerSidebar() {
  const { variables, addVariable, updateVariable, deleteVariable } = useVariablesStore();

  return (
    <div className="flex flex-col h-full py-3">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-0 border-b bg-background"
      >
        <Button 
          onClick={() => addVariable()}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Broker
        </Button>
      </motion.div>

      <ScrollArea className="flex-1">
          <AnimatePresence>
            {Object.values(variables)
              .filter(v => !v.isDeleted)
              .map(variable => (
                <BrokerEditor
                  key={variable.id}
                  data={variable}
                  onChange={(data) => updateVariable(variable.id, data)}
                  onDelete={() => deleteVariable(variable.id)}
                />
              ))}
          </AnimatePresence>
      </ScrollArea>
    </div>
  );
}