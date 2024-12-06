// contexts/ShikiProvider.tsx
'use client';

import React, {createContext, useContext, useEffect, useState} from 'react';
import {createHighlighter, Highlighter} from 'shiki';
import {useTheme} from 'next-themes';

// Define supported themes
export const THEMES_2 = {
    light: 'github-light',
    dark: 'github-dark',
    lightHC: 'github-light-high-contrast',
    darkHC: 'github-dark-high-contrast',
    darkDimmed: 'github-dark-dimmed',

    // Add all new themes below
    andromeeda: 'andromeeda',
    auroraX: 'aurora-x',
    ayuDark: 'ayu-dark',
    catppuccinFrappe: 'catppuccin-frappe',
    catppuccinLatte: 'catppuccin-latte',
    catppuccinMacchiato: 'catppuccin-macchiato',
    catppuccinMocha: 'catppuccin-mocha',
    darkPlus: 'dark-plus',
    dracula: 'dracula',
    draculaSoft: 'dracula-soft',
    everforestDark: 'everforest-dark',
    everforestLight: 'everforest-light',
    githubDark: 'github-dark',
    githubDarkDefault: 'github-dark-default',
    githubDarkDimmed: 'github-dark-dimmed',
    githubDarkHighContrast: 'github-dark-high-contrast',
    githubLight: 'github-light',
    githubLightDefault: 'github-light-default',
    githubLightHighContrast: 'github-light-high-contrast',
    houston: 'houston',
    kanagawaDragon: 'kanagawa-dragon',
    kanagawaLotus: 'kanagawa-lotus',
    kanagawaWave: 'kanagawa-wave',
    laserwave: 'laserwave',
    lightPlus: 'light-plus',
    materialTheme: 'material-theme',
    materialThemeDarker: 'material-theme-darker',
    materialThemeLighter: 'material-theme-lighter',
    materialThemeOcean: 'material-theme-ocean',
    materialThemePalenight: 'material-theme-palenight',
    minDark: 'min-dark',
    minLight: 'min-light',
    monokai: 'monokai',
    nightOwl: 'night-owl',
    nord: 'nord',
    oneDarkPro: 'one-dark-pro',
    oneLight: 'one-light',
    plastic: 'plastic',
    poimandres: 'poimandres',
    red: 'red',
    rosePine: 'rose-pine',
    rosePineDawn: 'rose-pine-dawn',
    rosePineMoon: 'rose-pine-moon',
    slackDark: 'slack-dark',
    slackOchin: 'slack-ochin',
    snazzyLight: 'snazzy-light',
    solarizedDark: 'solarized-dark',
    solarizedLight: 'solarized-light',
    synthwave84: 'synthwave-84',
    tokyoNight: 'tokyo-night',
    vesper: 'vesper',
    vitesseBlack: 'vitesse-black',
    vitesseDark: 'vitesse-dark',
    vitesseLight: 'vitesse-light',
} as const;

// Define commonly used languages
export const SUPPORTED_LANGUAGES_2 = {
    angularHTML: {id: 'angular-html', alias: ''},
    angularTS: {id: 'angular-ts', alias: ''},
    astro: {id: 'astro', alias: ''},
    blade: {id: 'blade', alias: ''},
    c: {id: 'c', alias: ''},
    coffeeScript: {id: 'coffee', alias: 'coffeescript'},
    cpp: {id: 'cpp', alias: 'c++'},
    css: {id: 'css', alias: ''},
    glsl: {id: 'glsl', alias: ''},
    graphql: {id: 'graphql', alias: 'gql'},
    rubyHaml: {id: 'haml', alias: ''},
    handlebars: {id: 'handlebars', alias: 'hbs'},
    html: {id: 'html', alias: ''},
    htmlDerivative: {id: 'html-derivative', alias: ''},
    http: {id: 'http', alias: ''},
    imba: {id: 'imba', alias: ''},
    java: {id: 'java', alias: ''},
    javascript: {id: 'javascript', alias: 'js'},
    jinja: {id: 'jinja', alias: ''},
    jison: {id: 'jison', alias: ''},
    json: {id: 'json', alias: ''},
    json5: {id: 'json5', alias: ''},
    jsonc: {id: 'jsonc', alias: 'JSON with Comments'},
    jsonl: {id: 'jsonl', alias: 'JSON Lines'},
    jsx: {id: 'jsx', alias: ''},
    julia: {id: 'julia', alias: 'jl'},
    less: {id: 'less', alias: ''},
    markdown: {id: 'markdown', alias: 'md'},
    marko: {id: 'marko', alias: ''},
    mdc: {id: 'mdc', alias: ''},
    mdx: {id: 'mdx', alias: ''},
    php: {id: 'php', alias: ''},
    postCSS: {id: 'postcss', alias: ''},
    pug: {id: 'pug', alias: 'jade'},
    python: {id: 'python', alias: 'py'},
    r: {id: 'r', alias: ''},
    regexp: {id: 'regexp', alias: 'regex'},
    sass: {id: 'sass', alias: ''},
    scss: {id: 'scss', alias: ''},
    shell: {id: 'shellscript', alias: 'bashshshellzsh'},
    sql: {id: 'sql', alias: ''},
    stylus: {id: 'stylus', alias: 'styl'},
    svelte: {id: 'svelte', alias: ''},
    tsTags: {id: 'ts-tags', alias: 'lit'},
    tsx: {id: 'tsx', alias: ''},
    typescript: {id: 'typescript', alias: 'ts'},
    vue: {id: 'vue', alias: ''},
    vueHTML: {id: 'vue-html', alias: ''},
    wasm: {id: 'wasm', alias: ''},
    wgsl: {id: 'wgsl', alias: ''},
    xml: {id: 'xml', alias: ''},
    yaml: {id: 'yaml', alias: 'yml'},
} as const;

export const THEMES = {
    light: 'github-light',
    dark: 'github-dark',
    lightHC: 'github-light-high-contrast',
    darkHC: 'github-dark-high-contrast',
    darkDimmed: 'github-dark-dimmed',
} as const;

// Define commonly used languages
export const SUPPORTED_LANGUAGES = {
    html: {id: 'html', alias: ''},
    javascript: {id: 'javascript', alias: 'js'},
    json: {id: 'json', alias: ''},
    jsx: {id: 'jsx', alias: ''},
    markdown: {id: 'markdown', alias: 'md'},
    python: {id: 'python', alias: 'py'},
    tsx: {id: 'tsx', alias: ''},
    typescript: {id: 'typescript', alias: 'ts'},
    xml: {id: 'xml', alias: ''},
    yaml: {id: 'yaml', alias: 'yml'},
} as const;


type LanguageKey = keyof typeof SUPPORTED_LANGUAGES;
type Language = typeof SUPPORTED_LANGUAGES[LanguageKey];
type SupportedTheme = typeof THEMES[keyof typeof THEMES];

interface ShikiContextType {
    highlighter: Highlighter | null;
    loading: boolean;
    error: Error | null;
    highlight: (code: string, languageKey: LanguageKey) => Promise<string>;
    loadLanguage: (languageKey: LanguageKey) => Promise<void>;
    supportedLanguages: Set<LanguageKey>;
}

const ShikiContext = createContext<ShikiContextType>({
    highlighter: null,
    loading: true,
    error: null,
    highlight: async () => '',
    loadLanguage: async () => {
    },
    supportedLanguages: new Set(),
});

interface ShikiProviderProps {
    children: React.ReactNode;
    initialLanguages?: LanguageKey[];
}

export function ShikiProvider({
    children,
    initialLanguages = ['typescript', 'javascript', 'jsx', 'tsx', 'markdown'] as LanguageKey[]
}: ShikiProviderProps) {
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [supportedLanguages, setSupportedLanguages] = useState<Set<LanguageKey>>(new Set(initialLanguages));
    const {theme: currentTheme} = useTheme();

    // Initialize highlighter with themes and initial languages
    useEffect(() => {
        const initHighlighter = async () => {
            try {
                setLoading(true);
                const highlighter = await createHighlighter({
                    themes: Object.values(THEMES),
                    langs: initialLanguages.map(key => SUPPORTED_LANGUAGES[key].id),
                });
                setHighlighter(highlighter);
                setSupportedLanguages(new Set(initialLanguages));
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to initialize highlighter'));
                console.error('Failed to initialize Shiki:', err);
            } finally {
                setLoading(false);
            }
        };

        initHighlighter();
    }, []);

    // Function to load additional languages dynamically
    const loadLanguage = async (languageKey: LanguageKey) => {
        if (!highlighter || supportedLanguages.has(languageKey)) return;

        try {
            await highlighter.loadLanguage(SUPPORTED_LANGUAGES[languageKey].id as any);
            setSupportedLanguages(prev => new Set([...prev, languageKey]));
        } catch (err) {
            console.error(`Failed to load language ${languageKey}:`, err);
            throw err;
        }
    };

    // Main highlight function
    const highlight = async (code: string, languageKey: LanguageKey | undefined): Promise<string> => {
        if (!highlighter) {
            console.warn('Highlighter is not initialized yet.');
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }

        // Early return if languageKey is undefined
        if (!languageKey) {
            console.warn('No language key provided, falling back to plain text');
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }

        try {
            // Validate language key exists in SUPPORTED_LANGUAGES
            const language = SUPPORTED_LANGUAGES[languageKey];

            if (!language || !language.id) {
                console.warn(`Invalid language key: ${languageKey}, falling back to plain text`);
                return `<pre><code>${escapeHtml(code)}</code></pre>`;
            }

            // Ensure the language is loaded
            if (!supportedLanguages.has(languageKey)) {
                await loadLanguage(languageKey);
            }

            const theme = currentTheme === 'dark' ? THEMES.dark : THEMES.light;

            return highlighter.codeToHtml(code, {
                lang: language.id,
                themes: {
                    light: THEMES.light,
                    dark: THEMES.dark,
                },
                defaultColor: false,
            });
        } catch (err) {
            console.error('Error highlighting code:', err);
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }
    };

    const escapeHtml = (unsafe: string): string => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const value = {
        highlighter,
        loading,
        error,
        highlight,
        loadLanguage,
        supportedLanguages,
    };

    return (
        <ShikiContext.Provider value={value}>
            {children}
        </ShikiContext.Provider>
    );
}

// Custom hook to use the Shiki context
export const useShiki = () => {
    const context = useContext(ShikiContext);
    if (context === undefined) {
        throw new Error('useShiki must be used within a ShikiProvider');
    }
    return context;
};

// Utility hook for direct code highlighting
export const useCodeHighlight = (code: string, languageKey: LanguageKey | undefined) => {
    const [html, setHtml] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { highlight } = useShiki();

    useEffect(() => {
        let mounted = true;

        const highlightCode = async () => {
            try {
                setIsLoading(true);
                const highlighted = await highlight(code, languageKey);
                if (mounted) {
                    setHtml(highlighted);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to highlight code'));
                    console.error('Highlighting error:', err);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        highlightCode();

        return () => {
            mounted = false;
        };
    }, [code, languageKey, highlight]);

    return { html, isLoading, error };
};

// Export utility types
export type {LanguageKey, Language};
