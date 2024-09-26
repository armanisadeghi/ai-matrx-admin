'use client'

import React from 'react'
import MatrxTooltip from '@/components/matrx/MatrxTooltip'

export default function TooltipTestPage() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tooltip Test</h1>

            <div className="grid grid-cols-2 gap-4">
                {/* Top Tooltip */}
                <MatrxTooltip content="Tooltip on top" placement="top">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Tooltip top
                    </button>
                </MatrxTooltip>

                {/* Right Tooltip */}
                <MatrxTooltip content="Tooltip on right" placement="right">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Tooltip right
                    </button>
                </MatrxTooltip>

                {/* Bottom Tooltip */}
                <MatrxTooltip content="Tooltip on bottom" placement="bottom">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Tooltip bottom
                    </button>
                </MatrxTooltip>

                {/* Left Tooltip */}
                <MatrxTooltip content="Tooltip on left" placement="left">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Tooltip left
                    </button>
                </MatrxTooltip>
            </div>
        </div>
    )
}
