// FullFeaturedImageEditor Component
import React, { useState } from "react";
import {
    BottomMenu,
    Canvas,
    LayersPanel,
    ToolPanel,
    TopBar
} from "@/components/advanced-image-editor/layouts/AdvancedLayout";

const FullFeaturedImageEditor = () => {
    const [activeTab, setActiveTab] = useState('AI Tools');
    const [isToolPanelOpen, setIsToolPanelOpen] = useState(true);
    const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(true);

    return (
        <div className="flex flex-col h-screen w-full bg-gray-900 text-white overflow-hidden">
            <TopBar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isToolPanelOpen={isToolPanelOpen}
                setIsToolPanelOpen={setIsToolPanelOpen}
                isLayersPanelOpen={isLayersPanelOpen}
                setIsLayersPanelOpen={setIsLayersPanelOpen}
            />
            <div className="flex-1 relative overflow-hidden">
                <ToolPanel activeTab={activeTab} isToolPanelOpen={isToolPanelOpen} />
                <Canvas isToolPanelOpen={isToolPanelOpen} isLayersPanelOpen={isLayersPanelOpen} />
                <LayersPanel isLayersPanelOpen={isLayersPanelOpen} />
            </div>
            <BottomMenu />
        </div>
    );
};

export default FullFeaturedImageEditor;
