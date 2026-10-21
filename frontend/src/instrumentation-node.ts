import { serverEnv } from "@/lib/env";

// Runs once at server start (imported by instrumentation.ts in the Node.js runtime only).
try {
  serverEnv();
} catch (error) {
  // Next only logs a failing register() and keeps serving errors. Exit instead, like the API's
  // ValidateOnStart: a container that stops at once is easier to notice than one that answers 500.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
