import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * API client for Client Components. No base URL: requests go to the page's own origin ("/api/..."), which Caddy
 * (or the dev rewrite, P2-T5) sends to the API. Same origin means the browser attaches the login cookie by
 * itself and no CORS is involved (ADR-021).
 */
export const browserApi = createClient<paths>();
