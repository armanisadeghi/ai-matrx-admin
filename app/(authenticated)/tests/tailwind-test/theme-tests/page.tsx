'use client';

import { useTheme } from 'next-themes'

const DemoPage: React.FC = () => {
    const { theme } = useTheme()

    return (
        <div className={`p-4 ${theme === 'light' ? 'light-mode-bg-gradient light-mode-shadow' : ''}`}>
            <h2 className="text-accent font-semibold">Important Information</h2>
            <p className={`${theme === 'light' ? 'text-foreground font-medium' : 'text-foreground'}`}>
                This text will be slightly darker and bolder in light mode.
            </p>
            <button className="bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active">
                Click Me
            </button>
        </div>
    )
}

export default DemoPage
