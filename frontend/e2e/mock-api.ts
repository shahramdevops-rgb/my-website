// A tiny stand-in for the .NET API, so e2e tests run without the API and a database. Its answers are typed with
// the generated schema: if the contract changes, `pnpm typecheck` flags this file too. Started by
// playwright.config.ts with `node e2e/mock-api.ts` (Node 24 runs TypeScript by stripping the types).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { components } from "../src/lib/api/schema";

type SiteInfo = components["schemas"]["SiteInfoDto"];
type Resume = components["schemas"]["ResumeProfile"];

const siteInfo: SiteInfo = {
  // Must match e2e/smoke.spec.ts.
  name: { fa: "نام آزمایشی e2e", en: "e2e test name" },
  // Must match e2e/layout.spec.ts and e2e/contact.spec.ts: two links configured, Telegram not (hidden).
  social: { email: "e2e@example.com", gitHub: "https://github.com/e2e", telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

// Must match e2e/home.spec.ts, e2e/about.spec.ts and e2e/resume.spec.ts.
function resume(lang: "fa" | "en"): Resume {
  return {
    basics: {
      name: siteInfo.name[lang],
      headline: lang === "fa" ? "عنوان آزمایشی e2e" : "e2e test headline",
      summary: "e2e",
      location: "e2e",
    },
    links: [],
    experience: [
      {
        organization: lang === "fa" ? "سازمان آزمایشی e2e" : "e2e organization",
        role: lang === "fa" ? "نقش آزمایشی e2e" : "e2e role",
        start: "2020-09",
        end: null,
        location: null,
        summary: "e2e summary",
        highlights: ["e2e highlight 1", "e2e highlight 2"],
        tech: ["csharp", "react"],
      },
    ],
    // Newest first, like the real résumé.
    education: [
      {
        institution: "e2e university 2",
        degree: "MSc",
        field: "e2e field",
        start: "2000-01",
        end: "2002-01",
      },
      {
        institution: "e2e university 1",
        degree: "BSc",
        field: "e2e field",
        start: "1996-01",
        end: "2000-01",
      },
    ],
    skills: [
      { category: lang === "fa" ? "گروه آزمایشی e2e" : "e2e group", items: ["C#", "React"] },
    ],
    techStack: [
      { id: "csharp", name: "C#", description: "e2e" },
      { id: "dotnet", name: ".NET", description: "e2e" },
      { id: "react", name: "React", description: "e2e" },
    ],
  };
}

// The admin account and its session; must match e2e/admin.spec.ts. The real API checks a cookie encrypted with
// Data Protection; here one fixed value stands for "signed in".
type Dashboard = components["schemas"]["AdminDashboardDto"];
const admin = { email: "admin@e2e.test", password: "e2e correct passphrase" };
/** Signing in with this email answers 429, as the API's `login` rate limit would. */
const rateLimitedEmail = "limited@e2e.test";
const sessionCookie = "__Host-admin=e2e-session";
const dashboard: Dashboard = {
  posts: 12,
  projects: 3,
  pendingComments: 4,
  unreadMessages: 2,
  subscribers: 1234,
};

const port = Number(process.env.MOCK_API_PORT ?? 3101);

function json(response: ServerResponse, status: number, body: unknown, headers = {}): void {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

function problem(response: ServerResponse, status: number, code?: string, headers = {}): void {
  response.writeHead(status, { "content-type": "application/problem+json", ...headers });
  response.end(JSON.stringify({ status, ...(code ? { code } : {}) }));
}

function signedIn(request: IncomingMessage): boolean {
  return (request.headers.cookie ?? "").split(/;\s*/).includes(sessionCookie);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) body += chunk;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** /api/auth/* and /api/admin/*; false when the path is not one of them. */
async function handleAdmin(
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
): Promise<boolean> {
  if (request.method === "POST" && path === "/api/auth/login") {
    const { email, password } = await readJson(request);
    if (email === rateLimitedEmail)
      problem(response, 429, "request.rate_limited", { "retry-after": "120" });
    else if (email === admin.email && password === admin.password) {
      response.writeHead(204, {
        "set-cookie": `${sessionCookie}; Path=/; Secure; HttpOnly; SameSite=Strict`,
      });
      response.end();
    } else problem(response, 401, "auth.invalid_credentials");
    return true;
  }

  if (request.method === "POST" && path === "/api/auth/logout") {
    response.writeHead(204, {
      "set-cookie":
        "__Host-admin=; Path=/; Secure; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    });
    response.end();
    return true;
  }

  if (request.method === "GET" && path === "/api/auth/me") {
    if (signedIn(request)) json(response, 200, { email: admin.email });
    else problem(response, 401);
    return true;
  }

  if (request.method === "GET" && path === "/api/admin/dashboard") {
    if (signedIn(request)) json(response, 200, dashboard);
    else problem(response, 401);
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (await handleAdmin(request, response, url.pathname)) return;
  const lang = url.searchParams.get("lang");

  if (request.method === "GET" && url.pathname === "/api/site") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(siteInfo));
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/resume" &&
    (lang === "fa" || lang === "en")
  ) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(resume(lang)));
    return;
  }

  response.writeHead(404, { "content-type": "application/problem+json" });
  response.end(JSON.stringify({ title: "Not Found", status: 404 }));
}).listen(port);
