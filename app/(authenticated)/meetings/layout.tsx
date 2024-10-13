// File location: app/meetings/DynamicLayout.tsx
import {ReactNode} from "react";
import type {Metadata} from "next";
import {Inter} from "next/font/google";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "./module.css";
import {Toaster} from "@/components/ui/toaster";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
    title: "Matrx Meet",
    description: "Video calling App",
    icons: {
        icon: "/icons/logo.svg",
    },
};

const styleVariables = {
    "--color-text": "#fff",
    "--color-primary": "#0E78F9",
    "--color-background": "#1C1F2E",
    "--color-input-background": "#252A41",
    "--color-input-text": "#fff",
} as React.CSSProperties;

export default function MeetingsLayout(
    {
        children,
    }: Readonly<{ children: ReactNode }>) {
    return (
        <div
            className={`${inter.className} bg-dark-2`}
            style={{
                ...styleVariables,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{
                backgroundImage: "url('/icons/yoom-logo.svg')",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'top left',
                padding: '20px',
            }}>
                {/* You can add a header or navigation here if needed */}
            </div>
            <Toaster/>
            <div style={{flex: 1}}>
                {children}
            </div>
        </div>
    );
}
