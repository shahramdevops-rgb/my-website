// A tiny stand-in for the .NET API, so e2e tests run without the API and a database. Its answers are typed with
// the generated schema: if the contract changes, `pnpm typecheck` flags this file too. Started by
// playwright.config.ts with `node e2e/mock-api.ts` (Node 24 runs TypeScript by stripping the types).
import { createServer } from "node:http";
import type { components } from "../src/lib/api/schema";

type SiteInfo = components["schemas"]["SiteInfoDto"];

const siteInfo: SiteInfo = {
  // Must match e2e/smoke.spec.ts.
  name: { fa: "نام آزمایشی e2e", en: "e2e test name" },
  social: { email: null, gitHub: null, telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

const port = Number(process.env.MOCK_API_PORT ?? 3101);

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/site") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(siteInfo));
    return;
  }

  response.writeHead(404, { "content-type": "application/problem+json" });
  response.end(JSON.stringify({ title: "Not Found", status: 404 }));
}).listen(port);
