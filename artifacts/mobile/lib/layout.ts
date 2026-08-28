import { Platform } from "react-native";

/**
 * Screen chrome measurements, in one place.
 *
 * These were previously inline constants tuned for the Expo web preview, which
 * made every screen wrong once the app shipped as a phone PWA.
 */

/** True when running as an installed home-screen app rather than a browser tab. */
export function isStandaloneWeb(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)")?.matches;
  // iOS Safari predates the display-mode media query and uses its own flag.
  const ios = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  return !!mm || ios;
}

/**
 * Top padding for a screen header.
 *
 * The old rule was `insets.top + (web ? 67 : 10)`. On web `insets.top` is 0 in a
 * browser tab, so 67 stood in for a status bar that the browser was already
 * drawing — a dead band at the top of every screen. Installed as a PWA it was
 * worse: with viewport-fit=cover the safe-area inset IS reported, so the 67 was
 * added ON TOP of the real notch inset.
 *
 * The inset is the correct measure everywhere. The only thing it cannot cover is
 * an installed iOS PWA whose browser fails to report a safe area at all — hence
 * the floor, which applies only in that exact case.
 */
export function headerTopPadding(insetTop: number, extra = 10): number {
  if (Platform.OS !== "web") return insetTop + extra;
  const floor = isStandaloneWeb() && insetTop === 0 ? 44 : 0;
  return Math.max(insetTop, floor) + extra;
}

/**
 * Bottom padding for a scrollable screen.
 *
 * The role tab bars float above the content (position: absolute), so screens
 * inside them must reserve room or the last row sits under the bar. Screens in a
 * module Stack have no tab bar and only need to clear the home indicator —
 * reserving tab-bar space there leaves a large dead gap under every list, which
 * is what all the module screens were doing.
 */
export const TAB_BAR_CLEARANCE = 96;
export const STACK_CLEARANCE = 24;

export function scrollBottomPadding(insetBottom: number, hasTabBar: boolean): number {
  return (insetBottom || 0) + (hasTabBar ? TAB_BAR_CLEARANCE : STACK_CLEARANCE);
}
