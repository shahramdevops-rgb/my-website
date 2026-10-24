// Turns a failed `POST /api/auth/login` into what the login form says. The API's ProblemDetails carry a stable
// `code` (rules.md §8); the words come from messages (admin.login.errors.*), never from the API.

export type LoginError =
  | { kind: "invalidCredentials" }
  | { kind: "rateLimited"; minutes: number }
  | { kind: "invalidInput" }
  | { kind: "unavailable" };

/** Codes the API sends (`ErrorCodes` in PersonalSite.Api). */
const invalidCredentialsCode = "auth.invalid_credentials";

/**
 * `status` and `code` of the API's answer, `retryAfter` its Retry-After header (seconds). A missing or unknown
 * answer (network down, 5xx, a proxy's HTML page) is "unavailable": the admin should retry, not doubt the password.
 */
export function loginError(status: number, code: unknown, retryAfter: string | null): LoginError {
  if (status === 401 && code === invalidCredentialsCode) return { kind: "invalidCredentials" };
  if (status === 429) {
    const seconds = Number(retryAfter);
    return {
      kind: "rateLimited",
      minutes: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : 15,
    };
  }
  if (status === 400) return { kind: "invalidInput" };
  return { kind: "unavailable" };
}
