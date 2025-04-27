import React from "react";
import { AppConfig } from "../ConfigBuilder";
import { ArrowRight } from "lucide-react";

interface AppPreviewCardProps {
    app: Partial<AppConfig>;
    className?: string;
}

const AppPreviewCard: React.FC<AppPreviewCardProps> = ({ app, className = "" }) => {
    // Use placeholder values if app properties are not yet defined
    const appName = app.name || "Your App";
    const creatorName = app.creatorName || "Your Name";
    const description = app.description || "App description will appear here...";

    // Truncate description to ~250 characters
    const truncatedDescription = description.length > 250 ? `${description.substring(0, 247)}...` : description;

    // Determine if we have an image to display
    const hasImage = app.imageUrl && app.imageUrl.length > 0;

    return (
        <div className={`rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
            {/* App Image/Banner */}
            <div className="h-40 relative">
                {hasImage ? (
                    <img src={app.imageUrl} alt={appName} className="w-full h-full object-cover" />
                ) : (
                    <div className="h-full w-full bg-rose-500 flex items-center justify-center text-white font-medium">App Image</div>
                )}
            </div>

            {/* Content */}
            <div className="p-6 bg-white dark:bg-gray-800">
                {/* App & Creator Info */}
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{appName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">by {creatorName}</p>
                </div>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">{truncatedDescription}</p>

                {/* Launch Button */}
                <div className="flex justify-end">
                    <button className="inline-flex items-center text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium">
                        Launch <ArrowRight className="ml-1 h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppPreviewCard;
