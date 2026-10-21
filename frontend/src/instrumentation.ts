// Next.js calls register() once when a server starts, before it answers any request (file convention).
export async function register() {
  // Next compiles this file for every runtime and replaces NEXT_RUNTIME per build, so the Node.js-only code is
  // imported only where it can run (the Edge runtime, unused here, has no process.exit).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
