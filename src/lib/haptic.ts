// ── Haptic feedback utility ───────────────────────────────────────────────────
// On native iOS/Android (Capacitor) we use @capacitor/haptics for real taptic
// engine feedback.  In a plain browser we fall back to navigator.vibrate (works
// on Android Chrome; silently no-ops on iOS Safari / iOS Chrome).

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

async function nativeImpact(style: ImpactStyle): Promise<void> {
  try {
    await Haptics.impact({ style });
  } catch {
    // Not running inside Capacitor — no-op
  }
}

async function nativeNotification(type: NotificationType): Promise<void> {
  try {
    await Haptics.notification({ type });
  } catch {
    // Not running inside Capacitor — no-op
  }
}

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/** Very short tap — general button feedback */
export function hapticLight(): void {
  nativeImpact(ImpactStyle.Light);
  webVibrate(10);
}

/** Medium tap — toggles, selections */
export function hapticMedium(): void {
  nativeImpact(ImpactStyle.Medium);
  webVibrate(25);
}

/** Double-buzz — success / "Made" confirmation */
export function hapticSuccess(): void {
  nativeNotification(NotificationType.Success);
  webVibrate([50, 30, 50]);
}
