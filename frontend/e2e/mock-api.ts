// A tiny stand-in for the .NET API, so e2e tests run without the API and a database. Its answers are typed with
// the generated schema: if the contract changes, `pnpm typecheck` flags this file too. Started by
// playwright.config.ts with `node e2e/mock-api.ts` (Node 24 runs TypeScript by stripping the types).
import { createServer } from "node:http";
import type { components } from "../src/lib/api/schema";

type SiteInfo = components["schemas"]["SiteInfoDto"];
type Resume = components["schemas"]["ResumeProfile"];

const siteInfo: SiteInfo = {
  // Must match e2e/smoke.spec.ts.
  name: { fa: "نام آزمایشی e2e", en: "e2e test name" },
  // Must match e2e/layout.spec.ts: two links configured, Telegram not (hidden).
  social: { email: "e2e@example.com", gitHub: "https://github.com/e2e", telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

// Must match e2e/home.spec.ts.
function resume(lang: "fa" | "en"): Resume {
  return {
    basics: {
      name: siteInfo.name[lang],
      headline: lang === "fa" ? "عنوان آزمایشی e2e" : "e2e test headline",
      summary: "e2e",
      location: "e2e",
    },
    links: [],
    experience: [],
    education: [],
    skills: [],
    techStack: [
      { id: "csharp", name: "C#", description: "e2e" },
      { id: "dotnet", name: ".NET", description: "e2e" },
      { id: "react", name: "React", description: "e2e" },
    ],
  };
}

const port = Number(process.env.MOCK_API_PORT ?? 3101);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
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
