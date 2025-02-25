'use client';
import React, { useState } from "react";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";

interface SocketResponseProps {
    socketHook: SocketHook;
}

const MinimalScraperDisplay = ({ socketHook }: SocketResponseProps) => {
    const { streamingResponse, responses, responseRef } = socketHook;

    // For debugging - log what we're receiving
    console.log("Responses:", JSON.stringify(responses?.length));
    console.log("StreamingResponse type:", typeof streamingResponse);
    
    // Check if we have any responses
    if (!responses || responses.length === 0) {
        return <div>No responses available</div>;
    }

    // Create ultra-safe displays
    const safeDisplays = responses.map((response, index) => {
        // Debug info
        console.log(`Response ${index} type:`, typeof response);
        
        // Ultra-safe JSON parsing
        let parsedContent = null;
        let title = `Response ${index + 1}`;
        let url = "";
        let textData = "";
        
        try {
            // First, safely handle the response
            if (typeof response === "string") {
                try {
                    const parsed = JSON.parse(response);
                    if (parsed && typeof parsed === "object") {
                        if (parsed.parsed_content && typeof parsed.parsed_content === "string") {
                            const innerParsed = JSON.parse(parsed.parsed_content);
                            if (innerParsed && typeof innerParsed === "object") {
                                parsedContent = innerParsed;
                                title = String(innerParsed.overview?.page_title || title);
                                url = String(innerParsed.overview?.url || "");
                                textData = String(innerParsed.text_data || "");
                            }
                        } else {
                            parsedContent = parsed;
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing string response ${index}:`, e);
                }
            } else if (response && typeof response === "object") {
                if (response.parsed_content && typeof response.parsed_content === "string") {
                    try {
                        const parsed = JSON.parse(response.parsed_content);
                        if (parsed && typeof parsed === "object") {
                            parsedContent = parsed;
                            title = String(parsed.overview?.page_title || title);
                            url = String(parsed.overview?.url || "");
                            textData = String(parsed.text_data || "");
                        }
                    } catch (e) {
                        console.error(`Error parsing response ${index} parsed_content:`, e);
                    }
                } else {
                    // The response itself might be the parsed content
                    parsedContent = response;
                }
            }
        } catch (e) {
            console.error(`General error processing response ${index}:`, e);
        }

        // Return a very simple display that can't possibly break
        return (
            <div key={index} style={{ 
                marginBottom: '20px', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '5px' 
            }}>
                <h3 style={{ marginTop: '0' }}>{title}</h3>
                {url && <p style={{ fontSize: '14px', color: '#666' }}>{url}</p>}
                
                <div style={{ marginTop: '10px' }}>
                    <div style={{ 
                        maxHeight: '100px', 
                        overflow: 'auto', 
                        background: '#f5f5f5', 
                        padding: '10px',
                        marginBottom: '10px',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}>
                        {textData ? textData.substring(0, 200) + (textData.length > 200 ? '...' : '') : 'No text data available'}
                    </div>
                    
                    <div>
                        <h4>Data Structure:</h4>
                        <ul style={{ fontSize: '14px' }}>
                            {parsedContent && typeof parsedContent === 'object' ? 
                                Object.keys(parsedContent).map((key, i) => {
                                    // Safely display the key and value type only
                                    const valueType = typeof parsedContent[key];
                                    return (
                                        <li key={i}>
                                            <strong>{String(key)}</strong>: {valueType === 'object' ? 
                                                (parsedContent[key] === null ? 'null' : Array.isArray(parsedContent[key]) ? 'array' : 'object') : 
                                                valueType}
                                        </li>
                                    );
                                }) : 
                                <li>No structured data available</li>
                            }
                        </ul>
                    </div>
                </div>
            </div>
        );
    });

    return (
        <div style={{ padding: '20px' }}>
            <h2>Debug View - {responses.length} Response(s)</h2>
            {safeDisplays}
        </div>
    );
};

export default MinimalScraperDisplay;