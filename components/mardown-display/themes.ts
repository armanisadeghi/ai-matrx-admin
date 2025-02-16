export const THEMES = {
    professional: {
        container: {
            background: "from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950",
            border: "border-gray-200 dark:border-gray-800",
        },
        title: {
            gradient: "from-gray-600 to-slate-500 dark:from-gray-400 dark:to-slate-300",
            text: "text-gray-800 dark:text-gray-100",
            secondary: "text-gray-600 dark:text-gray-300",
        },
        item: {
            background: "bg-white dark:bg-gray-950/50",
            border: "border-gray-200 dark:border-gray-700",
            title: "text-gray-700 dark:text-gray-300",
            description: "text-gray-600 dark:text-gray-400",
        },
        debug: {
            background: "bg-gray-50 dark:bg-gray-950",
            border: "border-gray-200 dark:border-gray-800",
            text: "text-gray-700 dark:text-gray-300",
        },
        table: {
            header: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
            headerText: "text-gray-900 dark:text-gray-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-gray-50/50 dark:bg-gray-900/30",
                hover: "hover:bg-gray-50 dark:hover:bg-gray-800/20",
            },
            border: "border-gray-200 dark:border-gray-700",
            text: "text-gray-700 dark:text-gray-200",
        },
        card: {
            background: "bg-white dark:bg-gray-950/50",
            border: "border-gray-200 dark:border-gray-700",
            shadow: "shadow-sm",
            hover: "hover:border-gray-300 dark:hover:border-gray-600",
        },
        button: {
            primary: {
                background: "bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700",
                text: "text-gray-700 dark:text-gray-200",
                border: "border-gray-300 dark:border-gray-600",
            },
        },
        input: {
            background: "bg-white dark:bg-gray-950/50",
            border: "border-gray-300 dark:border-gray-600",
            text: "text-gray-700 dark:text-gray-200",
            placeholder: "placeholder-gray-400 dark:placeholder-gray-500",
            focus: "focus:border-gray-500 dark:focus:border-gray-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-gray-50/90 to-slate-50/90 dark:from-gray-950/90 dark:to-slate-950/90",
            border: "border-gray-200 dark:border-gray-700",
            item: {
                active: "bg-gray-100 dark:bg-gray-800",
                hover: "hover:bg-gray-50 dark:hover:bg-gray-800/70",
                text: "text-gray-600 dark:text-gray-300",
                activeText: "text-gray-900 dark:text-gray-100",
            },
        },
    },
    corporate: {
        container: {
            background: "from-blue-50 to-slate-50 dark:from-blue-950 dark:to-slate-950",
            border: "border-blue-200 dark:border-blue-800",
        },
        title: {
            gradient: "from-blue-600 to-slate-500 dark:from-blue-400 dark:to-slate-300",
            text: "text-blue-800 dark:text-blue-100",
            secondary: "text-blue-600 dark:text-blue-300",
        },
        item: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-100 dark:border-blue-700",
            title: "text-blue-700 dark:text-blue-300",
            description: "text-blue-600 dark:text-blue-400",
        },
        debug: {
            background: "bg-blue-50 dark:bg-blue-950",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-700 dark:text-blue-300",
        },
        table: {
            header: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
            headerText: "text-slate-900 dark:text-slate-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-slate-50/50 dark:bg-slate-900/30",
                hover: "hover:bg-slate-50 dark:hover:bg-slate-800/20",
            },
            border: "border-slate-200 dark:border-slate-700",
            text: "text-slate-700 dark:text-slate-200",
        },
        card: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-200 dark:border-blue-700",
            shadow: "shadow-sm",
            hover: "hover:border-blue-300 dark:hover:border-blue-600",
        },
        button: {
            primary: {
                background: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-white hover:bg-blue-50 dark:bg-blue-800 dark:hover:bg-blue-700",
                text: "text-blue-700 dark:text-blue-200",
                border: "border-blue-300 dark:border-blue-600",
            },
        },
        input: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-300 dark:border-blue-600",
            text: "text-blue-700 dark:text-blue-200",
            placeholder: "placeholder-blue-400 dark:placeholder-blue-500",
            focus: "focus:border-blue-500 dark:focus:border-blue-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-blue-50/90 to-slate-50/90 dark:from-blue-950/90 dark:to-slate-950/90",
            border: "border-blue-200 dark:border-blue-700",
            item: {
                active: "bg-blue-100 dark:bg-blue-800",
                hover: "hover:bg-blue-50 dark:hover:bg-blue-800/70",
                text: "text-blue-600 dark:text-blue-300",
                activeText: "text-blue-900 dark:text-blue-100",
            },
        },
    },
    corporateSubtle: {
        container: {
            background: "from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950",
            border: "border-slate-200 dark:border-slate-800",
        },
        title: {
            gradient: "from-slate-600 to-gray-600 dark:from-slate-400 dark:to-gray-400",
            text: "text-slate-800 dark:text-slate-200",
            secondary: "text-slate-600 dark:text-slate-400",
        },
        item: {
            background: "bg-white dark:bg-slate-950/50",
            border: "border-slate-200 dark:border-slate-800",
            title: "text-slate-700 dark:text-slate-300",
            description: "text-slate-600 dark:text-slate-400",
        },
        debug: {
            background: "bg-slate-50 dark:bg-slate-950",
            border: "border-slate-200 dark:border-slate-800",
            text: "text-slate-700 dark:text-slate-300",
        },
        table: {
            header: "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800",
            headerText: "text-slate-700 dark:text-slate-300",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-slate-50/30 dark:bg-slate-900/20",
                hover: "hover:bg-slate-50 dark:hover:bg-slate-800/10",
            },
            border: "border-slate-200 dark:border-slate-800",
            text: "text-slate-700 dark:text-slate-300",
        },
        card: {
            background: "bg-white dark:bg-slate-950/50",
            border: "border-slate-200 dark:border-slate-800",
            shadow: "shadow-sm",
            hover: "hover:border-slate-300 dark:hover:border-slate-700",
        },
        button: {
            primary: {
                background: "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500",
                text: "text-white",
            },
            secondary: {
                background: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800",
                text: "text-slate-700 dark:text-slate-300",
                border: "border-slate-300 dark:border-slate-700",
            },
        },
        input: {
            background: "bg-white dark:bg-slate-950/50",
            border: "border-slate-300 dark:border-slate-700",
            text: "text-slate-700 dark:text-slate-300",
            placeholder: "placeholder-slate-400 dark:placeholder-slate-500",
            focus: "focus:border-slate-400 dark:focus:border-slate-600",
        },
        sidebar: {
            background: "bg-gradient-to-b from-slate-50/95 to-gray-50/95 dark:from-slate-950/95 dark:to-gray-950/95",
            border: "border-slate-200 dark:border-slate-800",
            item: {
                active: "bg-slate-100 dark:bg-slate-900",
                hover: "hover:bg-slate-50 dark:hover:bg-slate-900/70",
                text: "text-slate-600 dark:text-slate-400",
                activeText: "text-slate-800 dark:text-slate-200",
            },
        },
    },


    pinkBlue: {
        container: {
            background: "from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950",
            border: "border-pink-200 dark:border-pink-800",
        },
        title: {
            gradient: "from-pink-500 to-cyan-400 dark:from-pink-400 dark:to-cyan-300",
            text: "text-pink-800 dark:text-pink-100",
            secondary: "text-pink-600 dark:text-pink-300",
        },
        item: {
            background: "bg-white dark:bg-pink-950/50",
            border: "border-pink-100 dark:border-pink-700",
            title: "text-pink-700 dark:text-pink-300",
            description: "text-pink-600 dark:text-pink-400",
        },
        link: {
            background: "bg-pink-50 dark:bg-pink-950",
            border: "border-pink-200 dark:border-pink-800",
            text: "text-blue-700 dark:text-blue-300",
        },
        debug: {
            background: "bg-pink-50 dark:bg-pink-950",
            border: "border-pink-200 dark:border-pink-800",
            text: "text-pink-700 dark:text-pink-300",
        },
        table: {
            header: "bg-pink-100 dark:bg-pink-900 hover:bg-pink-200 dark:hover:bg-pink-800",
            headerText: "text-pink-900 dark:text-pink-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-pink-50/50 dark:bg-pink-950/30",
                hover: "hover:bg-pink-50 dark:hover:bg-pink-900/20",
            },
            border: "border-pink-200 dark:border-pink-800",
            text: "text-pink-700 dark:text-pink-200",
        },
        card: {
            background: "bg-white dark:bg-pink-950/50",
            border: "border-pink-200 dark:border-pink-800",
            shadow: "shadow-sm",
            hover: "hover:border-pink-300 dark:hover:border-pink-700",
        },
        button: {
            primary: {
                background: "bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-pink-50 hover:bg-pink-100 dark:bg-pink-900 dark:hover:bg-pink-800",
                text: "text-pink-700 dark:text-pink-200",
                border: "border-pink-300 dark:border-pink-700",
            },
        },
        input: {
            background: "bg-white dark:bg-pink-950/50",
            border: "border-pink-300 dark:border-pink-700",
            text: "text-pink-700 dark:text-pink-200",
            placeholder: "placeholder-pink-400 dark:placeholder-pink-500",
            focus: "focus:border-pink-500 dark:focus:border-pink-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-pink-50/80 to-cyan-50/80 dark:from-pink-950/80 dark:to-cyan-950/80",
            border: "border-pink-200 dark:border-pink-800",
            item: {
                active: "bg-pink-100 dark:bg-pink-900/50",
                hover: "hover:bg-pink-50 dark:hover:bg-pink-900/30",
                text: "text-pink-600 dark:text-pink-300",
                activeText: "text-pink-900 dark:text-pink-100",
            },
        },
    },

    oceanBreeze: {
        container: {
            background: "from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-950",
            border: "border-blue-200 dark:border-blue-800",
        },
        title: {
            gradient: "from-blue-500 to-teal-400 dark:from-blue-400 dark:to-teal-300",
            text: "text-blue-800 dark:text-blue-100",
            secondary: "text-blue-600 dark:text-blue-300",
        },
        item: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-100 dark:border-blue-700",
            title: "text-blue-700 dark:text-blue-300",
            description: "text-blue-600 dark:text-blue-400",
        },
        debug: {
            background: "bg-blue-50 dark:bg-blue-950",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-700 dark:text-blue-300",
        },
        table: {
            header: "bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800",
            headerText: "text-blue-900 dark:text-blue-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-blue-50/50 dark:bg-blue-950/30",
                hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
            },
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-700 dark:text-blue-200",
        },
        card: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-200 dark:border-blue-800",
            shadow: "shadow-sm",
            hover: "hover:border-blue-300 dark:hover:border-blue-700",
        },
        button: {
            primary: {
                background: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800",
                text: "text-blue-700 dark:text-blue-200",
                border: "border-blue-300 dark:border-blue-700",
            },
        },
        input: {
            background: "bg-white dark:bg-blue-950/50",
            border: "border-blue-300 dark:border-blue-700",
            text: "text-blue-700 dark:text-blue-200",
            placeholder: "placeholder-blue-400 dark:placeholder-blue-500",
            focus: "focus:border-blue-500 dark:focus:border-blue-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-blue-50/80 to-teal-50/80 dark:from-blue-950/80 dark:to-teal-950/80",
            border: "border-blue-200 dark:border-blue-800",
            item: {
                active: "bg-blue-100 dark:bg-blue-900/50",
                hover: "hover:bg-blue-50 dark:hover:bg-blue-900/30",
                text: "text-blue-600 dark:text-blue-300",
                activeText: "text-blue-900 dark:text-blue-100",
            },
        },
    },

    forestMist: {
        container: {
            background: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
            border: "border-green-200 dark:border-green-800",
        },
        title: {
            gradient: "from-green-500 to-emerald-400 dark:from-green-400 dark:to-emerald-300",
            text: "text-green-800 dark:text-green-100",
            secondary: "text-green-600 dark:text-green-300",
        },
        item: {
            background: "bg-white dark:bg-green-950/50",
            border: "border-green-100 dark:border-green-700",
            title: "text-green-700 dark:text-green-300",
            description: "text-green-600 dark:text-green-400",
        },
        debug: {
            background: "bg-green-50 dark:bg-green-950",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-700 dark:text-green-300",
        },
        table: {
            header: "bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800",
            headerText: "text-green-900 dark:text-green-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-green-50/50 dark:bg-green-950/30",
                hover: "hover:bg-green-50 dark:hover:bg-green-900/20",
            },
            border: "border-green-200 dark:border-green-800",
            text: "text-green-700 dark:text-green-200",
        },
        card: {
            background: "bg-white dark:bg-green-950/50",
            border: "border-green-200 dark:border-green-800",
            shadow: "shadow-sm",
            hover: "hover:border-green-300 dark:hover:border-green-700",
        },
        button: {
            primary: {
                background: "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800",
                text: "text-green-700 dark:text-green-200",
                border: "border-green-300 dark:border-green-700",
            },
        },
        input: {
            background: "bg-white dark:bg-green-950/50",
            border: "border-green-300 dark:border-green-700",
            text: "text-green-700 dark:text-green-200",
            placeholder: "placeholder-green-400 dark:placeholder-green-500",
            focus: "focus:border-green-500 dark:focus:border-green-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-green-50/80 to-emerald-50/80 dark:from-green-950/80 dark:to-emerald-950/80",
            border: "border-green-200 dark:border-green-800",
            item: {
                active: "bg-green-100 dark:bg-green-900/50",
                hover: "hover:bg-green-50 dark:hover:bg-green-900/30",
                text: "text-green-600 dark:text-green-300",
                activeText: "text-green-900 dark:text-green-100",
            },
        },
    },
    sunsetGlow: {
        container: {
            background: "from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950",
            border: "border-orange-200 dark:border-orange-800",
        },
        title: {
            gradient: "from-orange-500 to-red-400 dark:from-orange-400 dark:to-red-300",
            text: "text-orange-800 dark:text-orange-100",
            secondary: "text-orange-600 dark:text-orange-300",
        },
        item: {
            background: "bg-white dark:bg-orange-950/50",
            border: "border-orange-100 dark:border-orange-700",
            title: "text-orange-700 dark:text-orange-300",
            description: "text-orange-600 dark:text-orange-400",
        },
        debug: {
            background: "bg-orange-50 dark:bg-orange-950",
            border: "border-orange-200 dark:border-orange-800",
            text: "text-orange-700 dark:text-orange-300",
        },
        table: {
            header: "bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800",
            headerText: "text-orange-900 dark:text-orange-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-orange-50/50 dark:bg-orange-950/30",
                hover: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
            },
            border: "border-orange-200 dark:border-orange-800",
            text: "text-orange-700 dark:text-orange-200",
        },
        card: {
            background: "bg-white dark:bg-orange-950/50",
            border: "border-orange-200 dark:border-orange-800",
            shadow: "shadow-sm",
            hover: "hover:border-orange-300 dark:hover:border-orange-700",
        },
        button: {
            primary: {
                background: "bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900 dark:hover:bg-orange-800",
                text: "text-orange-700 dark:text-orange-200",
                border: "border-orange-300 dark:border-orange-700",
            },
        },
        input: {
            background: "bg-white dark:bg-orange-950/50",
            border: "border-orange-300 dark:border-orange-700",
            text: "text-orange-700 dark:text-orange-200",
            placeholder: "placeholder-orange-400 dark:placeholder-orange-500",
            focus: "focus:border-orange-500 dark:focus:border-orange-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-orange-50/80 to-red-50/80 dark:from-orange-950/80 dark:to-red-950/80",
            border: "border-orange-200 dark:border-orange-800",
            item: {
                active: "bg-orange-100 dark:bg-orange-900/50",
                hover: "hover:bg-orange-50 dark:hover:bg-orange-900/30",
                text: "text-orange-600 dark:text-orange-300",
                activeText: "text-orange-900 dark:text-orange-100",
            },
        },
    },

    royalPurple: {
        container: {
            background: "from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950",
            border: "border-purple-200 dark:border-purple-800",
        },
        title: {
            gradient: "from-purple-500 to-indigo-400 dark:from-purple-400 dark:to-indigo-300",
            text: "text-purple-800 dark:text-purple-100",
            secondary: "text-purple-600 dark:text-purple-300",
        },
        item: {
            background: "bg-white dark:bg-purple-950/50",
            border: "border-purple-100 dark:border-purple-700",
            title: "text-purple-700 dark:text-purple-300",
            description: "text-purple-600 dark:text-purple-400",
        },
        debug: {
            background: "bg-purple-50 dark:bg-purple-950",
            border: "border-purple-200 dark:border-purple-800",
            text: "text-purple-700 dark:text-purple-300",
        },
        table: {
            header: "bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800",
            headerText: "text-purple-900 dark:text-purple-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-purple-50/50 dark:bg-purple-950/30",
                hover: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
            },
            border: "border-purple-200 dark:border-purple-800",
            text: "text-purple-700 dark:text-purple-200",
        },
        card: {
            background: "bg-white dark:bg-purple-950/50",
            border: "border-purple-200 dark:border-purple-800",
            shadow: "shadow-sm",
            hover: "hover:border-purple-300 dark:hover:border-purple-700",
        },
        button: {
            primary: {
                background: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800",
                text: "text-purple-700 dark:text-purple-200",
                border: "border-purple-300 dark:border-purple-700",
            },
        },
        input: {
            background: "bg-white dark:bg-purple-950/50",
            border: "border-purple-300 dark:border-purple-700",
            text: "text-purple-700 dark:text-purple-200",
            placeholder: "placeholder-purple-400 dark:placeholder-purple-500",
            focus: "focus:border-purple-500 dark:focus:border-purple-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-purple-50/80 to-indigo-50/80 dark:from-purple-950/80 dark:to-indigo-950/80",
            border: "border-purple-200 dark:border-purple-800",
            item: {
                active: "bg-purple-100 dark:bg-purple-900/50",
                hover: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
                text: "text-purple-600 dark:text-purple-300",
                activeText: "text-purple-900 dark:text-purple-100",
            },
        },
    },

    mintChocolate: {
        container: {
            background: "from-emerald-50 to-stone-50 dark:from-emerald-950 dark:to-stone-950",
            border: "border-emerald-200 dark:border-emerald-800",
        },
        title: {
            gradient: "from-emerald-500 to-stone-400 dark:from-emerald-400 dark:to-stone-300",
            text: "text-emerald-800 dark:text-emerald-100",
            secondary: "text-emerald-600 dark:text-emerald-300",
        },
        item: {
            background: "bg-white dark:bg-emerald-950/50",
            border: "border-emerald-100 dark:border-emerald-700",
            title: "text-emerald-700 dark:text-emerald-300",
            description: "text-emerald-600 dark:text-emerald-400",
        },
        debug: {
            background: "bg-emerald-50 dark:bg-emerald-950",
            border: "border-emerald-200 dark:border-emerald-800",
            text: "text-emerald-700 dark:text-emerald-300",
        },
        table: {
            header: "bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800",
            headerText: "text-emerald-900 dark:text-emerald-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-emerald-50/50 dark:bg-emerald-950/30",
                hover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
            },
            border: "border-emerald-200 dark:border-emerald-800",
            text: "text-emerald-700 dark:text-emerald-200",
        },
        card: {
            background: "bg-white dark:bg-emerald-950/50",
            border: "border-emerald-200 dark:border-emerald-800",
            shadow: "shadow-sm",
            hover: "hover:border-emerald-300 dark:hover:border-emerald-700",
        },
        button: {
            primary: {
                background: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900 dark:hover:bg-emerald-800",
                text: "text-emerald-700 dark:text-emerald-200",
                border: "border-emerald-300 dark:border-emerald-700",
            },
        },
        input: {
            background: "bg-white dark:bg-emerald-950/50",
            border: "border-emerald-300 dark:border-emerald-700",
            text: "text-emerald-700 dark:text-emerald-200",
            placeholder: "placeholder-emerald-400 dark:placeholder-emerald-500",
            focus: "focus:border-emerald-500 dark:focus:border-emerald-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-emerald-50/80 to-stone-50/80 dark:from-emerald-950/80 dark:to-stone-950/80",
            border: "border-emerald-200 dark:border-emerald-800",
            item: {
                active: "bg-emerald-100 dark:bg-emerald-900/50",
                hover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
                text: "text-emerald-600 dark:text-emerald-300",
                activeText: "text-emerald-900 dark:text-emerald-100",
            },
        },
    },
    warmEarth: {
        container: {
            background: "from-amber-50 to-stone-50 dark:from-amber-950 dark:to-stone-950",
            border: "border-amber-200 dark:border-amber-800",
        },
        title: {
            gradient: "from-amber-500 to-stone-400 dark:from-amber-400 dark:to-stone-300",
            text: "text-amber-800 dark:text-amber-100",
            secondary: "text-amber-600 dark:text-amber-300",
        },
        item: {
            background: "bg-white dark:bg-amber-950/50",
            border: "border-amber-100 dark:border-amber-700",
            title: "text-amber-700 dark:text-amber-300",
            description: "text-amber-600 dark:text-amber-400",
        },
        debug: {
            background: "bg-amber-50 dark:bg-amber-950",
            border: "border-amber-200 dark:border-amber-800",
            text: "text-amber-700 dark:text-amber-300",
        },
        table: {
            header: "bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800",
            headerText: "text-amber-900 dark:text-amber-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-amber-50/50 dark:bg-amber-950/30",
                hover: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
            },
            border: "border-amber-200 dark:border-amber-800",
            text: "text-amber-700 dark:text-amber-200",
        },
        card: {
            background: "bg-white dark:bg-amber-950/50",
            border: "border-amber-200 dark:border-amber-800",
            shadow: "shadow-sm",
            hover: "hover:border-amber-300 dark:hover:border-amber-700",
        },
        button: {
            primary: {
                background: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900 dark:hover:bg-amber-800",
                text: "text-amber-700 dark:text-amber-200",
                border: "border-amber-300 dark:border-amber-700",
            },
        },
        input: {
            background: "bg-white dark:bg-amber-950/50",
            border: "border-amber-300 dark:border-amber-700",
            text: "text-amber-700 dark:text-amber-200",
            placeholder: "placeholder-amber-400 dark:placeholder-amber-500",
            focus: "focus:border-amber-500 dark:focus:border-amber-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-amber-50/80 to-stone-50/80 dark:from-amber-950/80 dark:to-stone-950/80",
            border: "border-amber-200 dark:border-amber-800",
            item: {
                active: "bg-amber-100 dark:bg-amber-900/50",
                hover: "hover:bg-amber-50 dark:hover:bg-amber-900/30",
                text: "text-amber-600 dark:text-amber-300",
                activeText: "text-amber-900 dark:text-amber-100",
            },
        },
    },
    vibrantFun: {
        container: {
            background: "from-fuchsia-50 to-yellow-50 dark:from-fuchsia-950 dark:to-yellow-950",
            border: "border-fuchsia-200 dark:border-fuchsia-800",
        },
        title: {
            gradient: "from-fuchsia-500 to-yellow-400 dark:from-fuchsia-400 dark:to-yellow-300",
            text: "text-fuchsia-800 dark:text-fuchsia-100",
            secondary: "text-fuchsia-600 dark:text-fuchsia-300",
        },
        item: {
            background: "bg-white dark:bg-fuchsia-950/50",
            border: "border-fuchsia-100 dark:border-fuchsia-700",
            title: "text-fuchsia-700 dark:text-fuchsia-300",
            description: "text-fuchsia-600 dark:text-fuchsia-400",
        },
        debug: {
            background: "bg-fuchsia-50 dark:bg-fuchsia-950",
            border: "border-fuchsia-200 dark:border-fuchsia-800",
            text: "text-fuchsia-700 dark:text-fuchsia-300",
        },
        table: {
            header: "bg-fuchsia-100 dark:bg-fuchsia-900 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800",
            headerText: "text-fuchsia-900 dark:text-fuchsia-100",
            row: {
                even: "bg-white dark:bg-transparent",
                odd: "bg-fuchsia-50/50 dark:bg-fuchsia-950/30",
                hover: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20",
            },
            border: "border-fuchsia-200 dark:border-fuchsia-800",
            text: "text-fuchsia-700 dark:text-fuchsia-200",
        },
        card: {
            background: "bg-white dark:bg-fuchsia-950/50",
            border: "border-fuchsia-200 dark:border-fuchsia-800",
            shadow: "shadow-sm",
            hover: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
        },
        button: {
            primary: {
                background: "bg-fuchsia-600 hover:bg-fuchsia-700 dark:bg-fuchsia-700 dark:hover:bg-fuchsia-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-900 dark:hover:bg-fuchsia-800",
                text: "text-fuchsia-700 dark:text-fuchsia-200",
                border: "border-fuchsia-300 dark:border-fuchsia-700",
            },
        },
        input: {
            background: "bg-white dark:bg-fuchsia-950/50",
            border: "border-fuchsia-300 dark:border-fuchsia-700",
            text: "text-fuchsia-700 dark:text-fuchsia-200",
            placeholder: "placeholder-fuchsia-400 dark:placeholder-fuchsia-500",
            focus: "focus:border-fuchsia-500 dark:focus:border-fuchsia-400",
        },
        sidebar: {
            background: "bg-gradient-to-b from-fuchsia-50/80 to-yellow-50/80 dark:from-fuchsia-950/80 dark:to-yellow-950/80",
            border: "border-fuchsia-200 dark:border-fuchsia-800",
            item: {
                active: "bg-fuchsia-100 dark:bg-fuchsia-900/50",
                hover: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30",
                text: "text-fuchsia-600 dark:text-fuchsia-300",
                activeText: "text-fuchsia-900 dark:text-fuchsia-100",
            },
        },
    },
    neutral: {
        container: {
            background: "bg-neutral-50 dark:bg-neutral-900",
            border: "border-neutral-200 dark:border-neutral-700",
        },
        title: {
            text: "text-neutral-800 dark:text-neutral-100",
            secondary: "text-neutral-600 dark:text-neutral-300",
        },
        item: {
            background: "bg-white dark:bg-neutral-800",
            border: "border-neutral-200 dark:border-neutral-700",
            title: "text-neutral-700 dark:text-neutral-200",
            description: "text-neutral-600 dark:text-neutral-400",
        },
        debug: {
            background: "bg-neutral-50 dark:bg-neutral-900",
            border: "border-neutral-200 dark:border-neutral-700",
            text: "text-neutral-700 dark:text-neutral-300",
        },
        table: {
            header: "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700",
            headerText: "text-neutral-900 dark:text-neutral-100",
            row: {
                even: "bg-white dark:bg-neutral-800",
                odd: "bg-neutral-50 dark:bg-neutral-850",
                hover: "hover:bg-neutral-100 dark:hover:bg-neutral-700",
            },
            border: "border-neutral-200 dark:border-neutral-700",
            text: "text-neutral-700 dark:text-neutral-200",
        },
        // New sections
        card: {
            background: "bg-white dark:bg-neutral-800",
            border: "border-neutral-200 dark:border-neutral-700",
            shadow: "shadow-sm",
            hover: "hover:border-neutral-300 dark:hover:border-neutral-600",
        },
        button: {
            primary: {
                background: "bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600",
                text: "text-white dark:text-neutral-100",
            },
            secondary: {
                background: "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
                text: "text-neutral-700 dark:text-neutral-200",
                border: "border-neutral-300 dark:border-neutral-600",
            },
        },
        input: {
            background: "bg-white dark:bg-neutral-800",
            border: "border-neutral-300 dark:border-neutral-600",
            text: "text-neutral-700 dark:text-neutral-200",
            placeholder: "placeholder-neutral-400 dark:placeholder-neutral-500",
            focus: "focus:border-neutral-500 dark:focus:border-neutral-400",
        },
        sidebar: {
            background: "bg-neutral-50 dark:bg-neutral-900",
            border: "border-neutral-200 dark:border-neutral-700",
            item: {
                active: "bg-neutral-200 dark:bg-neutral-700",
                hover: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                text: "text-neutral-600 dark:text-neutral-300",
                activeText: "text-neutral-900 dark:text-neutral-100",
            },
        },
    },

    // Subtle slate theme
    slate: {
        container: {
            background: "bg-slate-50 dark:bg-slate-900",
            border: "border-slate-200 dark:border-slate-700",
        },
        title: {
            text: "text-slate-800 dark:text-slate-100",
            secondary: "text-slate-600 dark:text-slate-300",
        },
        item: {
            background: "bg-white dark:bg-slate-800",
            border: "border-slate-200 dark:border-slate-700",
            title: "text-slate-700 dark:text-slate-200",
            description: "text-slate-600 dark:text-slate-400",
        },
        debug: {
            background: "bg-slate-50 dark:bg-slate-900",
            border: "border-slate-200 dark:border-slate-700",
            text: "text-slate-700 dark:text-slate-300",
        },
        table: {
            header: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
            headerText: "text-slate-900 dark:text-slate-100",
            row: {
                even: "bg-white dark:bg-slate-800",
                odd: "bg-slate-50 dark:bg-slate-850",
                hover: "hover:bg-slate-100 dark:hover:bg-slate-700",
            },
            border: "border-slate-200 dark:border-slate-700",
            text: "text-slate-700 dark:text-slate-200",
        },
        card: {
            background: "bg-white dark:bg-slate-800",
            border: "border-slate-200 dark:border-slate-700",
            shadow: "shadow-sm",
            hover: "hover:border-slate-300 dark:hover:border-slate-600",
        },
        button: {
            primary: {
                background: "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600",
                text: "text-white dark:text-slate-100",
            },
            secondary: {
                background: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
                text: "text-slate-700 dark:text-slate-200",
                border: "border-slate-300 dark:border-slate-600",
            },
        },
        input: {
            background: "bg-white dark:bg-slate-800",
            border: "border-slate-300 dark:border-slate-600",
            text: "text-slate-700 dark:text-slate-200",
            placeholder: "placeholder-slate-400 dark:placeholder-slate-500",
            focus: "focus:border-slate-500 dark:focus:border-slate-400",
        },
        sidebar: {
            background: "bg-slate-50 dark:bg-slate-900",
            border: "border-slate-200 dark:border-slate-700",
            item: {
                active: "bg-slate-200 dark:bg-slate-700",
                hover: "hover:bg-slate-100 dark:hover:bg-slate-800",
                text: "text-slate-600 dark:text-slate-300",
                activeText: "text-slate-900 dark:text-slate-100",
            },
        },
    },

    // Calm blue theme
    blue: {
        container: {
            background: "bg-blue-50 dark:bg-slate-900",
            border: "border-blue-200 dark:border-slate-700",
        },
        title: {
            text: "text-blue-900 dark:text-blue-100",
            secondary: "text-blue-700 dark:text-blue-300",
        },
        item: {
            background: "bg-white dark:bg-slate-800",
            border: "border-blue-200 dark:border-slate-700",
            title: "text-blue-800 dark:text-blue-200",
            description: "text-blue-600 dark:text-blue-400",
        },
        debug: {
            background: "bg-blue-50 dark:bg-slate-900",
            border: "border-blue-200 dark:border-slate-700",
            text: "text-blue-700 dark:text-blue-300",
        },
        table: {
            header: "bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700",
            headerText: "text-blue-900 dark:text-slate-100",
            row: {
                even: "bg-white dark:bg-slate-800",
                odd: "bg-blue-50/50 dark:bg-slate-850",
                hover: "hover:bg-blue-50 dark:hover:bg-slate-700",
            },
            border: "border-blue-200 dark:border-slate-700",
            text: "text-blue-700 dark:text-slate-200",
        },
        card: {
            background: "bg-white dark:bg-slate-800",
            border: "border-blue-200 dark:border-slate-700",
            shadow: "shadow-sm",
            hover: "hover:border-blue-300 dark:hover:border-slate-600",
        },
        button: {
            primary: {
                background: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
                text: "text-white",
            },
            secondary: {
                background: "bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700",
                text: "text-blue-700 dark:text-blue-200",
                border: "border-blue-300 dark:border-slate-600",
            },
        },
        input: {
            background: "bg-white dark:bg-slate-800",
            border: "border-blue-300 dark:border-slate-600",
            text: "text-blue-700 dark:text-slate-200",
            placeholder: "placeholder-blue-400 dark:placeholder-slate-500",
            focus: "focus:border-blue-500 dark:focus:border-blue-400",
        },
        sidebar: {
            background: "bg-blue-50 dark:bg-slate-900",
            border: "border-blue-200 dark:border-slate-700",
            item: {
                active: "bg-blue-100 dark:bg-slate-700",
                hover: "hover:bg-blue-50 dark:hover:bg-slate-800",
                text: "text-blue-600 dark:text-slate-300",
                activeText: "text-blue-900 dark:text-slate-100",
            },
        },
    },
};

export type DisplayTheme = keyof typeof THEMES;

export const THEME_OPTIONS = [
    { value: 'professional', label: 'Professional', description: 'Clean and minimal grayscale design' },
    { value: 'corporate', label: 'Corporate', description: 'Professional blue and slate composition' },
    { value: 'corporateSubtle', label: 'Corporate Subtle', description: 'Professional blue and slate composition' },
    { value: 'neutral', label: 'Neutral', description: 'Clean and minimal grayscale design' },
    { value: 'slate', label: 'Slate', description: 'Clean and minimal grayscale design' },
    { value: 'blue', label: 'Blue', description: 'Clean and minimal grayscale design' },
    { value: 'pinkBlue', label: 'Pink & Blue', description: 'Vibrant pink and cyan gradient' },
    { value: 'oceanBreeze', label: 'Ocean Breeze', description: 'Calming blue and teal combination' },
    { value: 'forestMist', label: 'Forest Mist', description: 'Serene green and emerald blend' },
    { value: 'sunsetGlow', label: 'Sunset Glow', description: 'Warm orange and red gradient' },
    { value: 'royalPurple', label: 'Royal Purple', description: 'Rich purple and indigo fusion' },
    { value: 'mintChocolate', label: 'Mint Chocolate', description: 'Fresh emerald and stone mix' },
    { value: 'warmEarth', label: 'Warm Earth', description: 'Cozy amber and stone tones' },
    { value: 'vibrantFun', label: 'Vibrant Fun', description: 'Playful fuchsia and yellow blend' }
];

// If you need just the simple key-value pairs:
export const SIMPLE_THEME_OPTIONS = [
    { value: 'professional', label: 'Professional' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'corporateSubtle', label: 'Corporate Subtle' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'slate', label: 'Slate' },
    { value: 'blue', label: 'Blue' },
    { value: 'pinkBlue', label: 'Pink & Blue' },
    { value: 'oceanBreeze', label: 'Ocean Breeze' },
    { value: 'forestMist', label: 'Forest Mist' },
    { value: 'sunsetGlow', label: 'Sunset Glow' },
    { value: 'royalPurple', label: 'Royal Purple' },
    { value: 'mintChocolate', label: 'Mint Chocolate' },
    { value: 'warmEarth', label: 'Warm Earth' },
    { value: 'vibrantFun', label: 'Vibrant Fun' }
];


export const CODE_THEMES = [
    { id: 'coy', name: 'Coy' },
    { id: 'dark', name: 'Dark' },
    { id: 'funky', name: 'Funky' },
    { id: 'okaidia', name: 'Okaidia' },
    { id: 'solarizedlight', name: 'Solarized Light' },
    { id: 'tomorrow', name: 'Tomorrow' },
    { id: 'twilight', name: 'Twilight' },
    { id: 'prism', name: 'Prism' },
    { id: 'a11yDark', name: 'A11y Dark' },
    { id: 'atomDark', name: 'Atom Dark' },
    { id: 'base16AteliersulphurpoolLight', name: 'Base16 Atelier Sulphurpool Light' },
    { id: 'cb', name: 'CB' },
    { id: 'coldarkCold', name: 'Coldark Cold' },
    { id: 'coldarkDark', name: 'Coldark Dark' },
    { id: 'coyWithoutShadows', name: 'Coy Without Shadows' },
    { id: 'darcula', name: 'Darcula' },
    { id: 'dracula', name: 'Dracula' },
    { id: 'duotoneDark', name: 'Duotone Dark' },
    { id: 'duotoneEarth', name: 'Duotone Earth' },
    { id: 'duotoneForest', name: 'Duotone Forest' },
    { id: 'duotoneLight', name: 'Duotone Light' },
    { id: 'duotoneSea', name: 'Duotone Sea' },
    { id: 'duotoneSpace', name: 'Duotone Space' },
    { id: 'ghcolors', name: 'GH Colors' },
    { id: 'gruvboxDark', name: 'Gruvbox Dark' },
    { id: 'gruvboxLight', name: 'Gruvbox Light' },
    { id: 'holiTheme', name: 'Holi Theme' },
    { id: 'hopscotch', name: 'Hopscotch' },
    { id: 'lucario', name: 'Lucario' },
    { id: 'materialDark', name: 'Material Dark' },
    { id: 'materialLight', name: 'Material Light' },
    { id: 'materialOceanic', name: 'Material Oceanic' },
    { id: 'nightOwl', name: 'Night Owl' },
    { id: 'nord', name: 'Nord' },
    { id: 'oneDark', name: 'One Dark' },
    { id: 'oneLight', name: 'One Light' },
    { id: 'pojoaque', name: 'Pojoaque' },
    { id: 'shadesOfPurple', name: 'Shades of Purple' },
    { id: 'solarizedDarkAtom', name: 'Solarized Dark Atom' },
    { id: 'synthwave84', name: 'Synthwave 84' },
    { id: 'vs', name: 'VS Code Light' },
    { id: 'vscDarkPlus', name: 'VS Code Dark+' },
    { id: 'xonokai', name: 'Xonokai' },
    { id: 'zTouch', name: 'Z Touch' },
    { id: 'atomOneLight', name: 'Atom One Light' },
    { id: 'atomOneDark', name: 'Atom One Dark' },
    { id: 'atomOneLightResonable', name: 'Atom One Light Resonable' },
    { id: 'atomOneDarkResonable', name: 'Atom One Dark Resonable' },
    { id: 'vscDarkPlus', name: 'VS Code Dark+' },
    { id: 'vscLightPlus', name: 'VS Code Light+' },
    { id: 'vscDarkPlus', name: 'VS Code Dark+' },
  ];

