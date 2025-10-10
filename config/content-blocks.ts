// Configuration for content blocks system

export const contentBlocksConfig = {
    // Whether to use database-driven content blocks instead of static ones
    useDatabase: process.env.NEXT_PUBLIC_USE_DATABASE_CONTENT_BLOCKS !== 'false', // Default to true now that DB is set up
    
    // Auto-refresh interval for database content (in milliseconds)
    autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
    
    // Whether to auto-refresh database content
    autoRefresh: true,
    
    // Fallback to static content on database errors
    fallbackToStatic: true,
    
    // Cache duration for database content (in milliseconds)
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    
    // Default quick access block IDs
    defaultQuickAccessBlocks: ['heading-2', 'bullet-list', 'code-block', 'todo'],
    
    // Feature flags
    features: {
        // Enable the admin management interface
        enableAdminInterface: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_CONTENT_BLOCKS_ADMIN === 'true',
        
        // Enable real-time updates (if using Supabase realtime)
        enableRealTimeUpdates: false,
        
        // Enable content block analytics/usage tracking
        enableAnalytics: false,
    }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
    // Development settings
    contentBlocksConfig.autoRefreshInterval = 30 * 1000; // 30 seconds in dev
    contentBlocksConfig.features.enableAdminInterface = true;
}

export default contentBlocksConfig;
