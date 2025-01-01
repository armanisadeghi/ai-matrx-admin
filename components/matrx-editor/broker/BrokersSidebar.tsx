'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import BrokerEditor from "./BrokerEditor";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';

export default function BrokerSidebar() {
  const { brokers, createBroker, updateBroker, deleteBroker } = useBrokers();

  return (
    <div className="flex flex-col h-full py-3">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-0 border-b bg-background"
      >
        <Button 
          onClick={() => createBroker()}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Broker
        </Button>
      </motion.div>

      <ScrollArea className="flex-1">
          <AnimatePresence>
            {Object.values(brokers)
              .filter(v => !v.isDeleted)
              .map(variable => (
                <BrokerEditor
                  key={variable.id}
                  data={variable}
                  onChange={(data) => updateBroker(variable.id, data)}
                  onDelete={() => deleteBroker(variable.id)}
                />
              ))}
          </AnimatePresence>
      </ScrollArea>
    </div>
  );
}