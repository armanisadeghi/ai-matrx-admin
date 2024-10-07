// app/dashboard/hold-hold-page.tsx
"use client";
import React from "react";

import {AnimatePresence, motion} from "framer-motion";
import {CanvasRevealEffect} from "@/components/ui/canvas-reveal-effect";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {MatrixFloatingMenu} from "@/components/layout/floating-dock";
import MatrixLogo from "@/public/MatrixLogo";

const DashboardPage = () => {
    return (
        <>
            <div className="sticky top-0 z-50 ">
                <MatrixFloatingMenu/>
            </div>
            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>Total registered users</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">1,234</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue</CardTitle>
                            <CardDescription>Total revenue this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">$56,789</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Projects</CardTitle>
                            <CardDescription>Current active projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">42</p>
                        </CardContent>
                    </Card>
                </div>
                <div
                    className="py-20 flex flex-col lg:flex-row items-center justify-center w-full gap-4 mx-auto px-8">
                    <SpecialCard title="Absolutely ZERO Code Framework!" icon={<MatrixLogo size="2xl" variant={"vertical"}
                    />}>
                        <CanvasRevealEffect
                            animationSpeed={5.1}
                            containerClassName="bg-emerald-900"
                        />
                    </SpecialCard>
                    <SpecialCard title="Revolutionary Artificial Intelligence" icon={<MatrxImaGenLogo/>}>
                        <CanvasRevealEffect
                            animationSpeed={3}
                            containerClassName="bg-black"
                            colors={[
                                [236, 72, 153],
                                [232, 121, 249],
                            ]}
                            dotSize={2}
                        />
                        {/* Radial gradient for the cute fade */}
                        <div
                            className="absolute inset-0 [mask-image:radial-gradient(400px_at_center,white,transparent)] bg-black/50 dark:bg-black/90"/>
                    </SpecialCard>
                    <SpecialCard title="The most powerful AI-Egngine Ever Made" icon={<InfinitySymbol/>}>
                        <CanvasRevealEffect
                            animationSpeed={3}
                            containerClassName="bg-sky-600"
                            colors={[[125, 211, 252]]}
                        />
                    </SpecialCard>
                </div>
            </div>

        </>
    );
};

export default DashboardPage;



const SpecialCard = (
    {
        title,
        icon,
        children,
    }: {
        title: string;
        icon: React.ReactNode;
        children?: React.ReactNode;
    }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="border border-black/[0.2] group/canvas-card flex items-center justify-center dark:border-white/[0.2]  max-w-sm w-full mx-auto p-4 relative h-[30rem] relative"
        >
            <SpecialIcon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black"/>
            <SpecialIcon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black"/>
            <SpecialIcon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black"/>
            <SpecialIcon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black"/>

            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        className="h-full w-full absolute inset-0"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-20">
                <div
                    className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full  mx-auto flex items-center justify-center">
                    {icon}
                </div>
                <h2 className="dark:text-white text-xl opacity-0 group-hover/canvas-card:opacity-100 relative z-10 text-black mt-4  font-bold group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200">
                    {title}
                </h2>
            </div>
        </div>
    );
};


const InfinitySymbol = ({width = 100, height = 60, className = ''}) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 24 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M18 6C18 3.79086 16.2091 2 14 2C11.7909 2 10 3.79086 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10C8.20914 10 10 8.20914 10 6C10 8.20914 11.7909 10 14 10C16.2091 10 18 8.20914 18 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);


const AceternityIcon = () => {
    return (
        <svg
            width="66"
            height="65"
            viewBox="0 0 66 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-black dark:text-white group-hover/canvas-card:text-white "
        >
            <path
                d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
                stroke="currentColor"
                strokeWidth="15"
                strokeMiterlimit="3.86874"
                strokeLinecap="round"
                style={{mixBlendMode: "darken"}}
            />
        </svg>
    );
};


const SpecialIcon = ({className, ...rest}: any) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className={className}
            {...rest}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"/>
        </svg>
    );
};


const MatrxImaGenLogo = () => {
    return (

        <svg
            version="1.0"
            xmlns="http://www.w3.org/2000/svg"
            width="200pt"
            height="60pt"
            viewBox="0 0 622.000000 208.000000"
            preserveAspectRatio="xMidYMid meet"
        >

            <g transform="translate(0.000000,208.000000) scale(0.100000,-0.100000)"
               fill="#a11212"
               stroke="#000000"
            >
                <path d="M248 1923 c-2 -5 -2 -295 0 -645 l2 -638 121 0 121 0 -4 414 c-1 228
0 412 5 409 4 -2 7 -9 7 -14 0 -6 73 -190 161 -410 l161 -399 98 0 97 0 163
408 c90 224 166 410 169 414 3 4 5 -180 3 -407 l-3 -415 131 0 130 0 0 645 0
645 -155 0 c-116 0 -157 -3 -160 -12 -2 -7 -45 -121 -96 -253 -50 -132 -128
-338 -174 -458 -45 -119 -84 -220 -87 -222 -3 -3 -35 72 -72 167 -36 95 -120
308 -185 473 l-119 300 -155 3 c-86 1 -157 -1 -159 -5z"/>
                <path d="M3080 1855 c-30 -8 -68 -14 -83 -15 -15 0 -29 -6 -32 -12 -2 -7 -11
-39 -19 -70 -21 -73 -51 -108 -126 -144 l-60 -28 0 -73 0 -73 64 0 64 0 4
-302 c3 -291 4 -305 26 -353 30 -65 63 -98 126 -127 45 -20 66 -23 181 -23 72
0 138 3 148 7 15 6 17 22 17 111 l0 103 -63 -4 c-77 -5 -133 15 -147 53 -6 15
-10 136 -10 281 l0 254 120 0 120 0 0 100 0 100 -120 0 -120 0 0 115 c0 130 6
124 -90 100z"/>
                <path d="M2154 1650 c-195 -29 -324 -139 -350 -298 l-7 -42 137 0 136 0 0 28
c0 69 67 122 155 122 90 0 142 -40 152 -119 5 -35 2 -44 -24 -69 -23 -24 -48
-34 -128 -51 -253 -56 -353 -107 -409 -211 -23 -41 -28 -64 -28 -118 -1 -110
46 -192 135 -240 48 -25 61 -27 162 -27 101 0 114 2 163 28 30 16 73 46 97 68
l43 40 7 -61 7 -60 127 0 126 0 -2 273 c-5 468 -6 486 -32 544 -45 102 -146
169 -293 193 -70 11 -99 11 -174 0z m227 -622 c-4 -122 -59 -185 -177 -204
-146 -23 -201 135 -71 202 17 9 71 28 121 41 50 14 98 29 106 33 8 5 17 7 19
4 2 -2 3 -37 2 -76z"/>
                <path d="M4076 1644 c-59 -21 -104 -60 -146 -125 l-38 -59 -7 73 c-11 116 1
107 -136 107 l-119 0 0 -500 0 -500 140 0 140 0 0 297 c0 280 1 299 21 340 39
82 133 133 241 133 l49 0 -3 123 -3 122 -50 2 c-27 1 -68 -4 -89 -13z"/>
                <path d="M4333 1647 c3 -7 34 -53 69 -103 36 -49 113 -160 171 -246 l107 -157
-142 -203 c-78 -112 -157 -225 -176 -253 -19 -27 -52 -72 -73 -99 -61 -77 -58
-80 74 -74 123 6 207 30 245 71 12 13 70 94 129 182 60 87 113 160 118 162 6
1 61 -74 124 -168 76 -113 127 -179 150 -195 52 -34 143 -54 244 -54 80 0 89
2 85 17 -3 10 -59 95 -125 188 -66 94 -161 228 -210 299 l-90 129 173 251 c95
138 169 254 165 259 -4 4 -75 6 -157 5 l-149 -3 -100 -152 c-55 -83 -102 -152
-106 -152 -3 -1 -50 65 -105 147 -54 81 -103 150 -109 154 -5 4 -79 8 -164 8
-122 0 -152 -3 -148 -13z"/>
                <path d="M5550 1624 c0 -24 3 -26 40 -22 l40 4 0 -98 c0 -96 0 -98 24 -98 28
0 36 28 36 126 l0 64 35 0 c31 0 35 3 35 25 l0 25 -105 0 -105 0 0 -26z"/>
                <path d="M5830 1531 c0 -114 1 -121 20 -121 17 0 20 7 21 43 1 23 0 54 -1 70
-2 41 7 33 36 -28 18 -37 32 -55 44 -55 12 0 28 19 45 55 15 30 29 55 31 55 2
0 3 -10 2 -22 0 -13 0 -45 1 -71 1 -44 3 -48 24 -45 21 3 22 6 22 118 l0 115
-27 3 c-25 3 -30 -3 -61 -70 l-34 -73 -34 70 c-29 59 -38 71 -61 73 l-28 3 0
-120z"/>
                <path d="M2250 325 l0 -125 25 0 25 0 0 125 0 125 -25 0 -25 0 0 -125z"/>
                <path d="M2435 428 c-3 -13 -5 -68 -3 -123 3 -93 4 -100 24 -103 19 -3 22 3
27 59 4 33 4 65 1 70 -3 5 -1 9 3 9 5 0 21 -25 36 -55 15 -30 31 -55 36 -55
13 0 46 43 61 80 7 16 15 30 19 30 3 0 5 -31 3 -70 -4 -69 -3 -70 22 -70 l26
0 0 126 0 125 -27 -3 c-23 -2 -33 -14 -58 -65 -16 -34 -33 -65 -37 -68 -4 -4
-23 25 -42 64 -30 59 -40 71 -61 71 -17 0 -26 -7 -30 -22z"/>
                <path d="M2875 438 c-3 -7 -23 -62 -45 -122 -22 -60 -40 -110 -40 -112 0 -2
13 -4 29 -4 23 0 30 5 33 23 3 19 10 22 50 25 44 3 48 1 54 -22 5 -20 12 -26
35 -26 16 0 29 2 29 5 0 3 -14 43 -31 88 -17 45 -36 98 -44 117 -9 26 -19 36
-39 38 -15 2 -28 -2 -31 -10z m50 -115 c6 -31 5 -33 -19 -33 -30 0 -30 0 -14
52 12 42 21 37 33 -19z"/>
                <path d="M3161 437 c-86 -44 -91 -176 -9 -227 28 -18 43 -20 93 -15 33 4 63
12 67 18 4 7 8 36 8 65 l0 52 -50 0 c-43 0 -50 -3 -50 -20 0 -13 7 -20 20 -20
15 0 20 -7 20 -25 0 -22 -4 -25 -34 -25 -43 0 -76 38 -76 86 0 60 57 92 112
63 16 -9 24 -7 37 6 15 15 14 18 -8 36 -27 22 -93 25 -130 6z"/>
                <path d="M3439 438 c-2 -7 -3 -64 -1 -125 l3 -113 85 0 c77 0 84 2 84 20 0 18
-7 20 -60 20 l-60 0 0 30 c0 29 2 30 45 30 38 0 45 3 45 20 0 17 -7 20 -45 20
-43 0 -45 1 -45 30 l0 30 61 0 c57 0 60 1 57 23 -3 20 -9 22 -84 25 -60 2 -83
-1 -85 -10z"/>
                <path d="M3720 325 l0 -125 25 0 c23 0 24 3 27 78 l3 77 58 -77 c38 -51 65
-78 77 -78 19 0 20 8 20 125 l0 125 -25 0 c-25 0 -25 -2 -25 -77 l0 -77 -57
77 c-42 57 -63 77 -80 77 -23 0 -23 -1 -23 -125z"/>
            </g>
        </svg>
    );
}
