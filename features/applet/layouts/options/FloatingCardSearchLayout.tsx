import React, { useState, useMemo } from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import OpenSearchGroup from "@/features/applet/layouts/core/OpenSearchGroup";

const FloatingCardSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  actionButton,
  className = "",
}) => {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const gridCols = useMemo(() => {
    const count = appletDefinition.length;
    if (count <= 2 || count === 4 || count === 5) {
      return "md:grid-cols-2";
    } else {
      return "md:grid-cols-2 lg:grid-cols-3";
    }
  }, [appletDefinition.length]);

  return (
    <div className={`w-full max-w-6xl mx-auto p-4 ${className}`}>
      <div className={`grid grid-cols-1 ${gridCols} gap-10 py-8`}>
        {appletDefinition.map((group) => (
          <div 
            key={group.id} 
            className="relative"
            onMouseEnter={() => setHoveredGroup(group.id)}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-rose-100 to-rose-300 dark:from-rose-900 dark:to-rose-700 rounded-xl shadow-xl transform transition-all duration-300 ${
                hoveredGroup === group.id ? "scale-105 rotate-1" : ""
              }`}
              style={{ zIndex: 0 }}
            ></div>
            <div 
              className={`relative transition-all duration-300 transform ${
                hoveredGroup === group.id ? "translate-y-2" : "translate-y-6"
              }`}
              style={{ zIndex: 1 }}
            >
              <OpenSearchGroup
                id={group.id}
                label={group.label}
                placeholder={group.placeholder}
                description={group.description}
                fields={group.fields}
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