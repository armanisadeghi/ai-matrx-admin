// Example flexible layout component with typed props
import {ContentLayoutProps} from "@/app/(authenticated)/tests/dynamic-layouts/basic-layout-options/types";
import {layoutConfigs} from "@/app/(authenticated)/tests/dynamic-layouts/layoutConfigs";
import {ReactNode} from "react";

export const ContentLayout: React.FC<ContentLayoutProps> = (
    {
        type = 'single',
        variant = 'standard',
        primaryContent,
        secondaryContent,
        tertiaryContent,
        items = [],
        className = '',
    }) => {
    const config = layoutConfigs[type]?.[variant] || layoutConfigs.single.standard;

    // Helper to render grid/list items
    const renderItems = (items: ReactNode[]) => {
        return items.map((item, index) => (
            <div key={index} className={config.item}>
                {item}
            </div>
        ));
    };

    // Render different layout types
    const layouts = {
        single: (
            <div className={`${config.container} ${className}`}>
                <div className={config.content}>
                    {primaryContent}
                </div>
            </div>
        ),

        twoColumn: (
            <div className={`${config.container} ${className}`}>
                <div className={config.primary}>
                    {primaryContent}
                </div>
                <div className={config.secondary}>
                    {secondaryContent}
                </div>
            </div>
        ),

        threeColumn: (
            <div className={`${config.container} ${className}`}>
                {type === 'threeColumn' && variant === 'primaryCenter' ? (
                    <>
                        <div className={config.secondary}>
                            {secondaryContent}
                        </div>
                        <div className={config.primary}>
                            {primaryContent}
                        </div>
                        <div className={config.secondary}>
                            {tertiaryContent}
                        </div>
                    </>
                ) : (
                     <>
                         <div className={config.columns}>
                             {primaryContent}
                         </div>
                         <div className={config.columns}>
                             {secondaryContent}
                         </div>
                         <div className={config.columns}>
                             {tertiaryContent}
                         </div>
                     </>
                 )}
            </div>
        ),

        grid: (
            <div className={`${config.container} ${className}`}>
                {renderItems(items)}
            </div>
        ),

        list: (
            <div className={`${config.container} ${className}`}>
                {renderItems(items)}
            </div>
        ),
    };

    return layouts[type] || layouts.single;
};
