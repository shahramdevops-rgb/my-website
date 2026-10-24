// Flash messages: a toast that must survive a navigation ("Signed out" shown on the login page the logout led to).
// The message is parked in sessionStorage — this tab only, gone when it closes — and taken by the next page's
// Toaster. Only keys are stored; the text comes from messages (admin.flash.*).

export const flashKeys = ["signedIn", "signedOut"] as const;
export type FlashKey = (typeof flashKeys)[number];

const storageKey = "admin.flash";

function isFlashKey(value: unknown): value is FlashKey {
  return flashKeys.some((key) => key === value);
}

/** Leaves a message for the next page. */
export function setFlash(key: FlashKey): void {
  try {
    sessionStorage.setItem(storageKey, key);
  } catch {
    // Storage blocked: the action still worked, there is just no toast.
  }
}

/** The waiting message, removed so it shows once. */
export function takeFlash(): FlashKey | undefined {
  try {
    const value = sessionStorage.getItem(storageKey);
    sessionStorage.removeItem(storageKey);
    return isFlashKey(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
