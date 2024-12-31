'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  Blocks,
  MessageCircleQuestion,
} from "lucide-react";
import {
  componentTypes,
  sourceTypes,
  getComponentIcon,
  getSourceIcon,
} from "./constants";
import { Button } from "@/components/ui";
import { FloatingLabelInput } from "@/components/matrx/input";
import { cn } from "@/utils";
import FloatingLabelTextArea from "@/components/matrx/input/FloatingLabelTextArea";

const BrokerEditor = ({ data, onChange, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);
  const needsSourceDetails = ["API", "Database", "Function"].includes(
    data.defaultSource
  );

  const handleChange = (field, value) => {
    onChange?.({
      ...data,
      [field]: value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="my-4 last:mb-0"
    >
      <Card className="bg-elevation2 border border-elevation3 rounded-lg">
        <div
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-elevation3/50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-md bg-elevation2/50">
              {data.componentType ? (
                getComponentIcon(data.componentType)
              ) : (
                <MessageCircleQuestion className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
            <span className="font-medium text-sm truncate">
              {data.displayName || "Unnamed Broker"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="h-6 w-6 flex items-center justify-center rounded-md bg-elevation2/50"
              title={data.defaultSource}
            >
              {data.defaultSource ? (
                getSourceIcon(data.defaultSource)
              ) : (
                <Blocks className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>

            <div
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded-md",
                data.isConnected
                  ? "bg-success/10 text-success"
                  : "bg-elevation2/50"
              )}
              title={data.isConnected ? "Connected" : "Disconnected"}
            >
              {data.isConnected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>

            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-2 bg-background space-y-2 border-t">
                <div className="flex flex-wrap gap-2">
                  <div className="basis-52 grow">
                    <FloatingLabelInput
                      id="displayName"
                      label="Display Name"
                      value={data.displayName}
                      onChange={(e) => handleChange("displayName", e.target.value)}
                    />
                  </div>
                  <div className="basis-52 grow">
                    <FloatingLabelInput
                      id="officialName"
                      label="Official Name"
                      value={data.officialName}
                      onChange={(e) => handleChange("officialName", e.target.value)}
                    />
                  </div>
                </div>

                <FloatingLabelTextArea
                  id="value"
                  label="Broker Value"
                  value={data.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  rows={3}
                />

                <div className="flex flex-wrap gap-2">
                  <div className="basis-52 grow relative">
                    <select
                      className="w-full bg-elevation1 rounded-md p-2 text-sm appearance-none pl-8"
                      value={data.componentType}
                      onChange={(e) => handleChange("componentType", e.target.value)}
                    >
                      <option value="" disabled>
                        Component Type
                      </option>
                      {componentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      {data.componentType && getComponentIcon(data.componentType)}
                    </div>
                  </div>

                  <div className="basis-52 grow relative">
                    <select
                      className="w-full bg-elevation1 rounded-md p-2 text-sm appearance-none pl-8"
                      value={data.defaultSource}
                      onChange={(e) => handleChange("defaultSource", e.target.value)}
                    >
                      <option value="" disabled>
                        Default Source
                      </option>
                      {sourceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      {data.defaultSource && getSourceIcon(data.defaultSource)}
                    </div>
                  </div>
                </div>

                {needsSourceDetails && (
                  <FloatingLabelInput
                    id="sourceDetails"
                    label={`${data.defaultSource} Details`}
                    value={data.sourceDetails}
                    onChange={(e) => handleChange("sourceDetails", e.target.value)}
                  />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default BrokerEditor;