"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";

const initialActions = [
  { id: "action1", name: "Send Email", inputs: ["to", "subject"], outputs: ["status"] },
  { id: "action2", name: "Fetch Data", inputs: ["url"], outputs: ["data"] },
];

const RelationshipWorkflowMaker = () => {
  const [actions, setActions] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [connections, setConnections] = useState([]);

  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === "toolbox" && destination.droppableId === "canvas") {
      const action = initialActions.find((a) => a.id === result.draggableId);
      if (action) {
        setActions([...actions, { ...action, x: 100, y: 100 }]);
      } else if (result.draggableId === "broker") {
        setBrokers([...brokers, { id: `broker-${Date.now()}`, x: 200, y: 200, type: "broker" }]);
      }
    }
  };

  const connectPort = (fromId: string, fromType: "output" | "broker", toId: string, toType: "broker" | "input") => {
    setConnections([...connections, { fromId, fromType, toId, toType }]);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="w-full h-screen flex bg-gray-100 dark:bg-gray-900">
        {/* Sidebar Toolbox */}
        <div className="w-64 p-4 bg-gray-200 dark:bg-gray-800 flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search actions..."
            className="p-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-400 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Droppable droppableId="toolbox" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {initialActions.map((action, index) => (
                  <Draggable key={action.id} draggableId={action.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-2 bg-blue-400 text-white rounded-lg cursor-grab"
                      >
                        {action.name}
                      </div>
                    )}
                  </Draggable>
                ))}
                <Draggable draggableId="broker" index={initialActions.length}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-2 bg-purple-500 text-white rounded-lg cursor-grab"
                    >
                      New Broker
                    </div>
                  )}
                </Draggable>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Canvas */}
        <Droppable droppableId="canvas">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 relative overflow-auto bg-grid"
            >
              {actions.map((action) => (
                <motion.div
                  key={action.id}
                  className="absolute p-4 rounded-lg shadow-md bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                  style={{ left: action.x, top: action.y }}
                  drag
                  dragMomentum={false}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span>{action.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                      {action.inputs.map((input) => (
                        <div
                          key={input}
                          className="w-4 h-4 bg-red-400 rounded-full cursor-pointer"
                          onClick={() => connectPort(`${action.id}-${input}`, "output", action.id, "broker")}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      {action.outputs.map((output) => (
                        <div
                          key={output}
                          className="w-4 h-4 bg-green-400 rounded-full cursor-pointer"
                          onClick={() => connectPort(`${action.id}-${output}`, "output", action.id, "broker")}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
              {brokers.map((broker) => (
                <motion.div
                  key={broker.id}
                  className="absolute w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white animate-pulse"
                  style={{ left: broker.x, top: broker.y }}
                  drag
                  dragMomentum={false}
                >
                  {broker.type}
                </motion.div>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
};

export default RelationshipWorkflowMaker;