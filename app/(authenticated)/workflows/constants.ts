// app/(authenticated)/workflows/constants.ts
// This file contains initial data for the workflow editor

export const initialNodes = [
    {
        id: "trigger-1",
        type: "trigger",
        position: { x: 50, y: 200 },
        data: { label: "When chat message received" },
    },
    {
        id: "agent-1",
        type: "agent",
        position: { x: 300, y: 50 },
        data: {
            label: "AI Agent",
            subLabel: "Tools Agent",
            props: ["Chat Model", "Memory", "Tool"],
        },
    },
    {
        id: "api-1",
        type: "api",
        position: { x: 600, y: 50 },
        data: {
            label: "API Request",
            endpoint: "https://api.example.com/data",
            method: "GET",
            auth: { type: "Bearer", enabled: true },
        },
    },
    {
        id: "database-1",
        type: "database",
        position: { x: 600, y: 250 },
        data: {
            label: "PostgreSQL",
            action: "SELECT * FROM users",
            connectionStatus: "connected",
            query: "SELECT * FROM users WHERE status = $1",
        },
    },
    {
        id: "transform-1",
        type: "transform",
        position: { x: 900, y: 175 },
        data: {
            label: "Transform",
            transformationType: "JSON to CSV",
            schema: { input: "JSON", output: "CSV" },
        },
    },
    // Example nodes for the new types
    {
        id: "email-1",
        type: "email",
        position: { x: 300, y: 400 },
        data: {
            label: "Send Email",
            subLabel: "Notification",
            deliveryStatus: "pending",
            template: "Hi {{name}}, your appointment is scheduled for {{time}}.",
        },
    },
    {
        id: "fileOperation-1",
        type: "fileOperation",
        position: { x: 600, y: 400 },
        data: {
            label: "Upload Report",
            operation: "upload",
            fileType: "document",
            progress: 75,
        },
    },
    {
        id: "auth-1",
        type: "authentication",
        position: { x: 900, y: 400 },
        data: {
            label: "API Authentication",
            authType: "api_key",
            connected: true,
            securityWarning: "Remember to secure your credentials",
        },
    },
    {
        id: "webhook-1",
        type: "webhook",
        position: { x: 1200, y: 400 },
        data: {
            label: "GitHub Webhook",
            active: true,
            endpoint: "https://api.github.com/webhooks",
            lastTriggered: "2023-12-01T10:30:00Z",
        },
    },
];

export const initialEdges = [
    { 
        id: "e1-2", 
        source: "trigger-1", 
        target: "agent-1",
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' }
    },
    { 
        id: "e2-3", 
        source: "agent-1", 
        target: "api-1", 
        type: "custom",
        animated: true, 
        style: { strokeWidth: 2, stroke: '#6366f1', strokeDasharray: "5,5" },
        label: "API Call"
    },
    { 
        id: "e2-4", 
        source: "agent-1", 
        target: "database-1", 
        type: "custom",
        animated: true, 
        style: { strokeWidth: 2, stroke: '#0891b2', strokeDasharray: "5,5" },
        label: "Query"
    },
    { 
        id: "e3-5", 
        source: "api-1", 
        target: "transform-1",
        type: "custom"
    },
    { 
        id: "e4-5", 
        source: "database-1", 
        target: "transform-1",
        type: "custom"
    },
    // Example edges for the new nodes
    { 
        id: "e2-6", 
        source: "agent-1", 
        target: "email-1", 
        type: "custom",
        animated: true,
        label: "Send"
    },
    { 
        id: "e6-7", 
        source: "email-1", 
        target: "fileOperation-1",
        type: "custom",
        label: "Attachment"
    },
    { 
        id: "e7-8", 
        source: "fileOperation-1", 
        target: "auth-1",
        type: "custom"
    },
    { 
        id: "e8-9", 
        source: "auth-1", 
        target: "webhook-1",
        type: "custom",
        label: "Notify"
    },
];
