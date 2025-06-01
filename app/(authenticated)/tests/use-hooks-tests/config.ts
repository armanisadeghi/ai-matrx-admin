// config.ts

import {ModulePage} from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: 'Use Throttle & Debounce Tests',
        path: 'use-throttle-debounce',
        relative: true,
        description: 'Throttle computationally expensive operations with useThrottle and debounce Delays the execution of function or state update'
    },
    {
        title: 'Child Relationship',
        path: 'use-throttle-debounce/child-relationship',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Processed Child Relationship',
        path: 'use-throttle-debounce/processed-child-relationship',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Relationships',
        path: 'use-throttle-debounce/relationships',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Use Double',
        path: 'use-throttle-debounce/use-double',
        relative: true,
        description: 'ADDED DURING REVIEW'
    },
    {
        title: 'Use Debounce Test',
        path: 'use-debounce',
        relative: true,
        description: 'Delay the execution of function or state update with useDebounce'
    },
    {
        title: 'Use LocalStorage Test',
        path: 'use-localstorage',
        relative: true,
        description: 'Store, retrieve, and synchronize data from the browser\'s localStorage API with useLocalStorage'
    },
    {
        title: 'Use WindowSize Test',
        path: 'use-windowsize',
        relative: true,
        description: 'Track the dimensions of the browser window with useWindowSize'
    },
    {
        title: 'Use Previous Test',
        path: 'use-previous',
        relative: true,
        description: 'Track the previous value of a variable with usePrevious'
    },
    {
        title: 'Use IntersectionObserver Test',
        path: 'use-intersectionobserver',
        relative: true,
        description: 'Track and manage the visibility of your DOM elements within the viewport with useIntersectionObserver'
    },
    {
        title: 'Use NetworkState Test',
        path: 'use-networkstate',
        relative: true,
        description: 'Monitor and adapt to network conditions seamlessly with useNetworkState'
    },
    {
        title: 'Use MediaQuery Test',
        path: 'use-mediaquery',
        relative: true,
        description: 'Subscribe and respond to media query changes with useMediaQuery'
    },
    {
        title: 'Use Orientation Test',
        path: 'use-orientation',
        relative: true,
        description: 'Manage and respond to changes in device orientation with useOrientation'
    },
    {
        title: 'Use SessionStorage Test',
        path: 'use-sessionstorage',
        relative: true,
        description: 'Store, retrieve, and synchronize data from the browser\'s session storage with useSessionStorage'
    },
    {
        title: 'Use PreferredLanguage Test',
        path: 'use-preferredlanguage',
        relative: true,
        description: 'Adapt to user language preferences dynamically with usePreferredLanguage'
    },
    {
        title: 'Use Fetch Test',
        path: 'use-fetch',
        relative: true,
        description: 'Fetch data with accurate states, caching, and no stale responses using useFetch'
    },
    {
        title: 'Use ContinuousRetry Test',
        path: 'use-continuousretry',
        relative: true,
        description: 'Automates retries of a callback function until it succeeds with useContinuousRetry'
    },
    {
        title: 'Use VisibilityChange Test',
        path: 'use-visibilitychange',
        relative: true,
        description: 'Track document visibility and respond to changes with useVisibilityChange'
    },
    {
        title: 'Board Game Spinner Test',
        path: 'board-game-spinner',
        relative: true,
        description: "There's no better way to learn useHooks than by building it yourself."
    },
    {
        title: 'Use Script Test',
        path: 'use-script',
        relative: true,
        description: 'Load and manage external JavaScript scripts with useScript'
    },
    {
        title: 'Use RenderInfo Test',
        path: 'use-renderinfo',
        relative: true,
        description: 'Debug renders and improve performance with useRenderInfo'
    },
    {
        title: 'Use RenderCount Test',
        path: 'use-rendercount',
        relative: true,
        description: 'Identify unnecessary re-renders and monitor update frequency with useRenderCount'
    },
    {
        title: 'Use RandomInterval Test',
        path: 'use-randominterval',
        relative: true,
        description: 'Execute a callback function at a random interval with useRandomInterval'
    },
    {
        title: 'Use IntervalWhen Test',
        path: 'use-intervalwhen',
        relative: true,
        description: 'Create dynamic timers that can be started, paused, or resumed with useIntervalWhen'
    },
    {
        title: 'Use Interval Test',
        path: 'use-interval',
        relative: true,
        description: 'Schedule periodic actions like data polling or animations with useInterval'
    },
    {
        title: 'Use LockBodyScroll Test',
        path: 'use-lockbodyscroll',
        relative: true,
        description: 'Temporarily disable scrolling on the document body with useLockBodyScroll'
    },
    {
        title: 'Use Countdown Test',
        path: 'use-countdown',
        relative: true,
        description: 'Create countdown timers using useCountdown'
    },
    {
        title: 'Use IsClient Test',
        path: 'use-isclient',
        relative: true,
        description: 'Determine whether the code is running on the client-side or server-side with useIsClient'
    },
    {
        title: 'Use Queue Test',
        path: 'use-queue',
        relative: true,
        description: 'Add, remove, and clear element from a queue data structure with useQueue'
    },
    {
        title: 'Use Hover Test',
        path: 'use-hover',
        relative: true,
        description: 'Track whether an element is being hovered over with useHover'
    },
    {
        title: 'Use Timeout Test',
        path: 'use-timeout',
        relative: true,
        description: 'Create delayed actions or timed events using useTimeout'
    },
    {
        title: 'Use EventListener Test',
        path: 'use-eventlistener',
        relative: true,
        description: 'Listen for events on a target element with useEventListener'
    },
    {
        title: 'Use KeyPress Test',
        path: 'use-keypress',
        relative: true,
        description: 'Detect and perform actions on key press events with useKeyPress'
    },
    {
        title: 'Use Map Test',
        path: 'use-map',
        relative: true,
        description: 'Synchronize and update state based on the Map data structure with useMap'
    },
    {
        title: 'Use Set Test',
        path: 'use-set',
        relative: true,
        description: 'Synchronize and update state based on the Set data structure with useSet'
    },
    {
        title: 'Use CopyToClipboard Test',
        path: 'use-copytoclipboard',
        relative: true,
        description: 'Copy text to the clipboard using useCopyToClipboard'
    },
    {
        title: 'Use Battery Test',
        path: 'use-battery',
        relative: true,
        description: 'Track the battery status of a user\'s device with useBattery'
    },
    {
        title: 'Use Idle Test',
        path: 'use-idle',
        relative: true,
        description: 'Detect user inactivity with useIdle'
    },
    {
        title: 'Use Toggle Test',
        path: 'use-toggle',
        relative: true,
        description: 'A hook to toggle a boolean value with useToggle'
    },
    {
        title: 'Use HistoryState Test',
        path: 'use-historystate',
        relative: true,
        description: 'Add undo / redo functionality with useHistoryState'
    },
    {
        title: 'Use Geolocation Test',
        path: 'use-geolocation',
        relative: true,
        description: 'Access and monitor a user\'s geolocation (after they give permission) with useGeolocation'
    },
    {
        title: 'Use PageLeave Test',
        path: 'use-pageleave',
        relative: true,
        description: 'Track when a user navigates away from a webpage with usePageLeave'
    },
    {
        title: 'Use ObjectState Test',
        path: 'use-objectstate',
        relative: true,
        description: 'Manage complex state objects with useObjectState'
    },
    {
        title: 'Use Logger Test',
        path: 'use-logger',
        relative: true,
        description: 'Debug lifecycle events with useLogger'
    },
    {
        title: 'Use DocumentTitle Test',
        path: 'use-documenttitle',
        relative: true,
        description: 'Dynamically update the title of a webpage with useDocumentTitle'
    },
    {
        title: 'Use IsFirstRender Test',
        path: 'use-isfirstrender',
        relative: true,
        description: 'Differentiate between the first and subsequent renders with useIsFirstRender'
    },
    {
        title: 'Use LongPress Test',
        path: 'use-longpress',
        relative: true,
        description: 'Enable precise control of long-press interactions for both touch and mouse events with useLongPress'
    },
    {
        title: 'Use Favicon Test',
        path: 'use-favicon',
        relative: true,
        description: 'Dynamically update the favicon with useFavicon'
    },
    {
        title: 'Use Default Test',
        path: 'use-default',
        relative: true,
        description: 'Manage state with default values using useDefault'
    },
    {
        title: 'Use WindowScroll Test',
        path: 'use-windowscroll',
        relative: true,
        description: 'Track and manipulate the scroll position of a web page with useWindowScroll'
    },
    {
        title: 'Use Measure Test',
        path: 'use-measure',
        relative: true,
        description: "Effortlessly measure and track your component's dimensions with useMeasure"
    },
    {
        title: 'Use ClickAway Test',
        path: 'use-clickaway',
        relative: true,
        description: 'Detect clicks outside of specific component with useClickAway'
    },
    {
        title: 'Use List Test',
        path: 'use-list',
        relative: true,
        description: 'Manage and manipulate lists with useList'
    },
    {
        title: 'Use Counter Test',
        path: 'use-counter',
        relative: true,
        description: 'Manage a counter value with minimum and maximum limits with useCounter'
    }
];

export const filteredPages = pages.filter(page => page.path !== 'link-here');

export const MODULE_HOME = '/tests/use-hooks-tests';
export const MODULE_NAME = 'Use Hooks Tests';
