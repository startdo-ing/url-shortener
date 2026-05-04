/** R-034 — paths that bypass session gate when AUTH_MODE=session. */

export function sessionAuthBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/api/login" ||
    pathname === "/api/logout" ||
    pathname.startsWith("/_astro/")
  );
}
