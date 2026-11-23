/**
 * A path on this site, safe to navigate to from the router state (the browser's history entry): it starts with one "/";
 * "//host" and "/\host" would leave the site (react-router reads both as an absolute URL, like the browser does).
 * Used by GuestOnly (`from`) and the profile's back links (review 2026-11-23).
 */
export function isSitePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !/^\/[\\/]/.test(value)
}
