// 2. Workflow Context (manages shared state)
// src/contexts/WorkflowContext.jsx
import React, { createContext, useContext, useState, useReducer } from "react";

const WorkflowContext = createContext(null);

const initialState = {
    nodes: [],
    connections: [],
    brokers: [],
    selectedNode: null,
    draggingNode: null,
    draggingConnection: null,
    scale: 1,
    notification: null,
};

function workflowReducer(state, action) {
    switch (action.type) {
        case "ADD_NODE":
            return {
                ...state,
                nodes: [...state.nodes, action.payload],
                selectedNode: action.payload.id,
            };
        case "ADD_BROKER":
            return {
                ...state,
                brokers: [...state.brokers, action.payload],
                selectedNode: action.payload.id,
            };
        case "ADD_CONNECTION":
            return {
                ...state,
                connections: [...state.connections, action.payload],
            };
        case "SELECT_NODE":
            return {
                ...state,
                selectedNode: action.payload,
            };
        case "SET_DRAGGING_NODE":
            return {
                ...state,
                draggingNode: action.payload,
            };
        case "SET_DRAGGING_CONNECTION":
            return {
                ...state,
                draggingConnection: action.payload,
            };
        case "UPDATE_NODE_POSITION":
            return {
                ...state,
                nodes: state.nodes.map((node) => (node.id === action.payload.id ? { ...node, position: action.payload.position } : node)),
            };
        case "UPDATE_BROKER_POSITION":
            return {
                ...state,
                brokers: state.brokers.map((broker) =>
                    broker.id === action.payload.id ? { ...broker, position: action.payload.position } : broker
                ),
            };
        case "SET_SCALE":
            return {
                ...state,
                scale: action.payload,
            };
        case "SHOW_NOTIFICATION":
            return {
                ...state,
                notification: action.payload,
            };
        case "CLEAR_NOTIFICATION":
            return {
                ...state,
                notification: null,
            };
        default:
            return state;
    }
}

export const WorkflowProvider = ({ children }) => {
    const [state, dispatch] = useReducer(workflowReducer, initialState);

    // Action creators
    const addAction = (actionType) => {
        const id = `action-${Date.now()}`;
        const newNode = {
            id,
            type: "action",
            actionType: actionType.id,
            name: actionType.name,
            category: actionType.category,
            position: { x: 200, y: 200 },
            inputs: actionType.inputs.map((input) => ({ ...input, connected: false })),
            outputs: actionType.outputs.map((output) => ({ ...output, connected: false })),
            status: "idle",
        };
        dispatch({ type: "ADD_NODE", payload: newNode });
        return id;
    };

    const addBroker = () => {
        const id = `broker-${Date.now()}`;
        const newBroker = {
            id,
            type: "broker",
            name: "Data Broker",
            position: { x: 400, y: 300 },
            inputs: [],
            outputs: [],
            mappedType: null,
            mappedValue: null,
        };
        dispatch({ type: "ADD_BROKER", payload: newBroker });
        return id;
    };

    const addSource = () => {
        const id = `source-${Date.now()}`;
        const newSource = {
            id,
            type: "source",
            name: "User Input",
            position: { x: 100, y: 100 },
            dataType: "string",
            defaultValue: "",
            description: "Input value provided by user",
        };
        dispatch({ type: "ADD_NODE", payload: newSource });
        return id;
    };

    const addDestination = (destType = "userOutput") => {
        const id = `destination-${Date.now()}`;
        const newDestination = {
            id,
            type: "destination",
            destinationType: destType,
            name: destType === "userOutput" ? "User Output" : "Database Output",
            position: { x: 600, y: 400 },
            dataMapping: {},
        };
        dispatch({ type: "ADD_NODE", payload: newDestination });
        return id;
    };

    const startConnectionDrag = (sourceId, outputName, isOutput = true) => {
        dispatch({
            type: "SET_DRAGGING_CONNECTION",
            payload: {
                sourceId,
                outputName,
                isOutput,
                targetId: null,
                inputName: null,
                points: [],
            },
        });
    };

    const completeConnection = (targetId, inputName) => {
        if (!state.draggingConnection) return;

        // Add connection logic here
        // [Implementation details omitted for brevity]

        const newConnection = {
            id: `conn-${Date.now()}`,
            sourceId: state.draggingConnection.sourceId,
            outputName: state.draggingConnection.outputName,
            targetId: targetId,
            inputName: inputName,
        };

        dispatch({ type: "ADD_CONNECTION", payload: newConnection });
        dispatch({ type: "SET_DRAGGING_CONNECTION", payload: null });
        showNotification("Connection created successfully");
    };

    const showNotification = (message, type = "success") => {
        dispatch({ type: "SHOW_NOTIFICATION", payload: { message, type } });
        setTimeout(() => dispatch({ type: "CLEAR_NOTIFICATION" }), 3000);
    };

    const updateNodePosition = (id, position) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
            dispatch({
                type: "UPDATE_NODE_POSITION",
                payload: { id, position },
            });
        } else {
            dispatch({
                type: "UPDATE_BROKER_POSITION",
                payload: { id, position },
            });
        }
    };

    const setScale = (newScale) => {
        dispatch({ type: "SET_SCALE", payload: newScale });
    };

    const selectNode = (id) => {
        dispatch({ type: "SELECT_NODE", payload: id });
    };

    const setDraggingNode = (id) => {
        dispatch({ type: "SET_DRAGGING_NODE", payload: id });
    };

    const value = {
        ...state,
        addAction,
        addBroker,
        addSource,
        addDestination,
        startConnectionDrag,
        completeConnection,
        updateNodePosition,
        setScale,
        selectNode,
        setDraggingNode,
        showNotification,
    };

    return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};
export const useWorkflow = () => {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error("useWorkflow must be used within a WorkflowProvider");
    }
    return context;
};
