/**
 * Input sanitization utilities for note content.
 * Prevents XSS and validates data URLs for screenshot rendering.
 */

/** Maximum allowed length for note text (characters). */
const MAX_NOTE_TEXT_LENGTH = 10_000;

/** Maximum allowed length for alert message (characters). */
const MAX_ALERT_MESSAGE_LENGTH = 500;

/** Maximum allowed size for a base64 data URL screenshot (bytes). */
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

/** Allowed MIME types for screenshot data URLs. */
const ALLOWED_SCREENSHOT_MIMES = ["image/png", "image/jpeg", "image/webp"];

/** Data URL prefix pattern: data:<mime>;base64, */
const DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/;

/**
 * Validate that a screenshot string is a safe base64 data URL.
 * Returns the string if valid, or undefined if invalid.
 */
export function sanitizeScreenshot(dataUrl: string | undefined): string | undefined {
  if (!dataUrl) return undefined;

  // Must be a data URL with an allowed image MIME type
  if (!DATA_URL_REGEX.test(dataUrl)) return undefined;

  // Check size limit
  if (dataUrl.length > MAX_SCREENSHOT_SIZE) return undefined;

  // Extract MIME and verify it's allowed
  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
  if (!mimeMatch || !ALLOWED_SCREENSHOT_MIMES.includes(mimeMatch[1])) return undefined;

  return dataUrl;
}

/**
 * Sanitize note text — trim and enforce length limit.
 * Note: React renders text content safely (no innerHTML), so HTML escaping
 * is not needed here. This guard is for storage size limits.
 */
export function sanitizeNoteText(text: string): string {
  if (text.length > MAX_NOTE_TEXT_LENGTH) {
    return text.slice(0, MAX_NOTE_TEXT_LENGTH);
  }
  return text;
}

/**
 * Sanitize alert message text — trim and enforce length limit.
 */
export function sanitizeAlertMessage(message: string): string {
  if (message.length > MAX_ALERT_MESSAGE_LENGTH) {
    return message.slice(0, MAX_ALERT_MESSAGE_LENGTH);
  }
  return message;
}

/**
 * Validate a URL string. Returns true if it's a valid http/https URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate an avatar URL — must be https or a data URL with image MIME.
 */
export function isValidAvatarUrl(url: string): boolean {
  if (!url) return false;
  // Allow Google profile picture URLs
  if (url.startsWith("https://")) return true;
  // Allow data URLs for cached avatars
  if (DATA_URL_REGEX.test(url)) return true;
  return false;
}
