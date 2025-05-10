import React, { useState, useMemo } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/core/AppletInputLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const FloatingCardSearchLayout: React.FC<AppletInputProps> = ({
  actionButton,
  className = "",
}) => {
  const activeAppletContainers = useAppSelector(state => selectActiveAppletContainers(state))
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const gridCols = useMemo(() => {
    const count = activeAppletContainers.length;
    if (count <= 2 || count === 4 || count === 5) {
      return "md:grid-cols-2";
    } else {
      return "md:grid-cols-2 lg:grid-cols-3";
    }
  }, [activeAppletContainers.length]);

  return (
    <div className={`w-full max-w-6xl mx-auto p-4 ${className}`}>
      <div className={`grid grid-cols-1 ${gridCols} gap-10 py-8`}>
        {activeAppletContainers.map((container) => (
          <div 
            key={container.id} 
            className="relative"
            onMouseEnter={() => setHoveredGroup(container.id)}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-rose-100 to-rose-300 dark:from-rose-900 dark:to-rose-700 rounded-xl shadow-xl transform transition-all duration-300 ${
                hoveredGroup === container.id ? "scale-105 rotate-1" : ""
              }`}
              style={{ zIndex: 0 }}
            ></div>
            <div 
              className={`relative transition-all duration-300 transform ${
                hoveredGroup === container.id ? "translate-y-2" : "translate-y-6"
              }`}
              style={{ zIndex: 1 }}
            >
              <OpenContainerGroup
                id={container.id}
                label={container.label}
                description={container.description}
                fields={container.fields}
                isActive={true}
                onClick={() => {}}
                onOpenChange={() => {}}
                isLast={false}
                isMobile={false}
                className="rounded-xl shadow-lg"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        {actionButton}
      </div>
    </div>
  );
};

export default FloatingCardSearchLayout;