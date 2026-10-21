import "server-only";

/**
 * Server-only settings from `process.env`. None is prefixed `NEXT_PUBLIC_`, so none ever reaches the browser.
 * Checked once when the server starts (`src/instrumentation.ts`): a missing or invalid value stops the server
 * instead of breaking the first request — the same idea as `ValidateOnStart` in the API.
 */
export type ServerEnv = {
  /**
   * Where the Next.js server reaches the API directly, without going through Caddy:
   * `http://api:8080` in Docker, `http://localhost:5080` on the host (`.env.development`). No trailing slash.
   */
  apiInternalUrl: string;
};

type EnvSource = Record<string, string | undefined>;

/** Reads and validates every value; the error lists all problems at once, not just the first. */
export function parseServerEnv(source: EnvSource): ServerEnv {
  const problems: string[] = [];

  const apiInternalUrl = readHttpUrl(source, "API_INTERNAL_URL", problems);

  if (problems.length > 0) {
    throw new Error(`Invalid environment variables:\n- ${problems.join("\n- ")}`);
  }

  return { apiInternalUrl };
}

let cached: ServerEnv | undefined;

/** The validated settings of this process (parsed on first use, then reused). */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

function readHttpUrl(source: EnvSource, name: string, problems: string[]): string {
  const value = source[name]?.trim();
  if (!value) {
    problems.push(`${name} is not set.`);
    return "";
  }

  if (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol)) {
    problems.push(`${name} must be an absolute http(s) URL, got "${value}".`);
    return "";
  }

  return value.replace(/\/+$/, "");
}
