/**
 * Notification Sound Utility
 * 
 * Provides functionality to play notification sounds for new messages.
 * Uses Web Audio API to generate a pleasant notification tone.
 * 
 * BROWSER POLICY NOTES:
 * - Web Audio API does NOT require explicit permission prompts
 * - Audio works automatically after ANY user interaction (click, key press, etc.)
 * - The AudioContext may be in "suspended" state until first user interaction
 * - We handle this gracefully by attempting to resume and playing when possible
 */

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

/**
 * Get or create the AudioContext (lazy initialization)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Unlock audio playback - call this on any user interaction
 * This ensures the AudioContext is ready when needed
 * Safe to call multiple times - only runs once
 */
export function unlockAudio(): void {
  if (audioUnlocked) return;
  
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioUnlocked = true;
      });
    } else {
      audioUnlocked = true;
    }
  } catch {
    // Silently fail - will try again on next interaction
  }
}

/**
 * Play a notification sound using Web Audio API
 * Creates a pleasant two-tone notification beep
 * 
 * NOTE: This does NOT require any browser permission.
 * It works automatically after the user has interacted with the page.
 * If no interaction has occurred yet, the sound simply won't play (no error shown to user).
 * 
 * @param volume - Volume level from 0 to 100
 */
export function playNotificationSound(volume: number = 50): void {
  try {
    const ctx = getAudioContext();
    
    // If context is suspended, try to resume
    // If we can't (no user interaction yet), silently skip
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // No user interaction yet - can't play sound, that's OK
      });
      return; // Don't try to play until resumed
    }
    
    const now = ctx.currentTime;
    const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
    
    // Create gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(normalizedVolume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    // First tone (higher pitch)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    // Second tone (lower pitch, slightly delayed)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, now + 0.15); // E5
    osc2.connect(gainNode);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.3);
    
    audioUnlocked = true;
  } catch (error) {
    // Silently fail - don't spam console for normal browser behavior
  }
}

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 * Returns: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request permission for browser desktop notifications
 * 
 * IMPORTANT: Only call this in response to a user gesture (button click)!
 * Never call on page load - this follows browser best practices.
 * 
 * @returns true if permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  // Only request if not already denied
  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Show a browser desktop notification
 * Only works if permission was previously granted via requestNotificationPermission()
 */
export function showDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: '/logo.svg',
      tag: 'new-message', // Prevents duplicate notifications
      renotify: true,
    });
    
    if (onClick) {
      notification.onclick = () => {
        onClick();
        notification.close();
      };
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch {
    // Silently fail
  }
}
