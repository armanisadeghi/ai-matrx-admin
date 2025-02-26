import { HTMLAttributes, useState } from "react";

type Props = HTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: "primary" | "secondary" | "light" | "subtle";
    disabled?: boolean;
    tooltip?: string;
};

export const ActionIcon: React.FC<Props> = ({
    children,
    disabled = false,
    loading = false,
    tooltip,
    variant = "subtle",
    ...others
}) => {
    const baseStyles =
        "p-1.5 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantStyles = {
        primary: "text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500",
        secondary: "text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-500",
        light: "text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-500",
        subtle: "text-white hover:bg-neutral-700 active:bg-gray-200 focus:ring-gray-500",
    };

    const loadingStyles = "opacity-50 cursor-not-allowed";

    const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${loading ? loadingStyles : ""}`;

    const tooltipStyles =
        "invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded mb-2 whitespace-nowrap";

    return (
        <div className="relative inline-block group">
            {tooltip && (
                <div className={tooltipStyles} role="tooltip">
                    {tooltip}
                </div>
            )}
            <button className={buttonStyles} disabled={loading} title={tooltip} {...others}>
                {loading ? (
                    <span className="flex items-center justify-center">
                        <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                        Loading...
                    </span>
                ) : (
                    children
                )}
            </button>
        </div>
    );
};
