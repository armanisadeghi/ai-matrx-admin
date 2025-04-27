import React from "react";
import { Applet } from "../ConfigBuilder";
import { ArrowRight } from "lucide-react";

interface AppletPreviewCardProps {
    applet: Partial<Applet>;
    className?: string;
}

const AppletPreviewCard: React.FC<AppletPreviewCardProps> = ({ applet, className = "" }) => {
    // Use placeholder values if applet properties are not yet defined
    const appletName = applet.name || "Your Applet";
    const creatorName = applet.creatorName || "Your Name";
    const description = applet.description || "Applet description will appear here...";

    // Truncate description to ~250 characters
    const truncatedDescription = description.length > 250 ? `${description.substring(0, 247)}...` : description;

    // Determine if we have an image to display
    const hasImage = applet.imageUrl && applet.imageUrl.length > 0;

    // Create URL slug for display
    const slug = applet.slug || "";

    return (
        <div className={`rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
            {/* Applet Image/Banner */}
            <div className="h-40 relative">
                {hasImage ? (
                    <img src={applet.imageUrl} alt={appletName} className="w-full h-full object-cover" />
                ) : (
                    <div className="h-full w-full bg-rose-500 flex items-center justify-center text-white font-medium">Applet Image</div>
                )}
            </div>

            {/* Content */}
            <div className="p-6 bg-white dark:bg-gray-800">
                {/* Applet & Creator Info */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{appletName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">by {creatorName}</p>
                </div>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">{truncatedDescription}</p>

                {/* Slug display (if available) */}
                {slug && (
                    <div className="mb-5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            <span className="font-medium">URL: </span>
                            <span className="font-mono">aimatrx.com/.../.../{slug}</span>
                        </p>
                    </div>
                )}

                {/* Launch Button */}
                <div className="flex justify-end">
                    <button className="inline-flex items-center text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium">
                        Open <ArrowRight className="ml-1 h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppletPreviewCard; 