// Container healthcheck target (frontend/Dockerfile). Under /internal/, which Caddy answers with 404, so only
// Docker on the container's own network can reach it. It checks only that the Node.js server answers: an API
// outage must not make Docker restart a healthy front-end (same idea as the API's /health).
export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
