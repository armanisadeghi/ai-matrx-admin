/**
 * IP-Based Rate Limiting
 * 
 * Secondary defense layer - limits requests per IP regardless of fingerprint.
 * Prevents single-source abuse (automated scripts, VPN switching, etc.)
 * 
 * NOTE: This uses in-memory storage. For production scale with multiple servers,
 * consider migrating to Redis or another distributed cache.
 */

interface IPRateLimit {
    executions: number;
    windowStart: number;
    blocked: boolean;
}

// In-memory store (consider Redis for production scale with multiple servers)
const ipLimits = new Map<string, IPRateLimit>();

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_EXECUTIONS_PER_IP = 20; // 4x individual limit (allows household sharing)

/**
 * Check if IP is allowed to execute
 * @param ip IP address to check
 * @returns Object with allowed status, remaining count, and reset time
 */
export function checkIPRateLimit(ip: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
} {
    const now = Date.now();
    const limit = ipLimits.get(ip);
    
    // No record or window expired
    if (!limit || (now - limit.windowStart) > WINDOW_MS) {
        return {
            allowed: true,
            remaining: MAX_EXECUTIONS_PER_IP - 1,
            resetAt: now + WINDOW_MS
        };
    }
    
    // Check if blocked
    if (limit.blocked) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: limit.windowStart + WINDOW_MS
        };
    }
    
    // Check if at limit
    if (limit.executions >= MAX_EXECUTIONS_PER_IP) {
        limit.blocked = true;
        return {
            allowed: false,
            remaining: 0,
            resetAt: limit.windowStart + WINDOW_MS
        };
    }
    
    return {
        allowed: true,
        remaining: MAX_EXECUTIONS_PER_IP - limit.executions - 1,
        resetAt: limit.windowStart + WINDOW_MS
    };
}

/**
 * Record an IP execution
 * @param ip IP address to record
 */
export function recordIPExecution(ip: string): void {
    const now = Date.now();
    const limit = ipLimits.get(ip);
    
    if (!limit || (now - limit.windowStart) > WINDOW_MS) {
        // Create new record or reset expired window
        ipLimits.set(ip, {
            executions: 1,
            windowStart: now,
            blocked: false
        });
    } else {
        // Increment existing record
        limit.executions++;
    }
}

/**
 * Get IP rate limiter statistics (for monitoring)
 * @returns Statistics about IP limits
 */
export function getIPLimitStats(): {
    totalIPs: number;
    blockedIPs: number;
    activeIPs: number;
} {
    const now = Date.now();
    let blockedCount = 0;
    let activeCount = 0;
    
    for (const [, limit] of ipLimits.entries()) {
        // Only count non-expired entries
        if ((now - limit.windowStart) <= WINDOW_MS) {
            activeCount++;
            if (limit.blocked) {
                blockedCount++;
            }
        }
    }
    
    return {
        totalIPs: ipLimits.size,
        blockedIPs: blockedCount,
        activeIPs: activeCount
    };
}

/**
 * Cleanup expired IP records
 * Called periodically to prevent memory bloat
 */
function cleanupExpiredRecords(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [ip, limit] of ipLimits.entries()) {
        if ((now - limit.windowStart) > WINDOW_MS) {
            toDelete.push(ip);
        }
    }
    
    toDelete.forEach(ip => ipLimits.delete(ip));
    
    if (toDelete.length > 0) {
        console.log(`🧹 Cleaned up ${toDelete.length} expired IP rate limit records`);
    }
}

// Cleanup old entries periodically (every hour)
setInterval(cleanupExpiredRecords, 60 * 60 * 1000);

// Also cleanup on startup after a delay
setTimeout(cleanupExpiredRecords, 5 * 60 * 1000); // 5 minutes after startup
