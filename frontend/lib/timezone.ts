/**
 * Detect the user's timezone from the browser/device.
 * Returns an IANA timezone string like "America/New_York".
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}
