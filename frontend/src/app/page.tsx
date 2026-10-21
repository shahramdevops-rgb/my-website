import { connection } from "next/server";
import { getSiteInfo } from "@/lib/site/get-site-info";

// Placeholder home page: the [locale] segment and messages/{fa,en}.json arrive in P2-T6.
export default async function HomePage() {
  // Render on each request, never at build time: the API isn't running during `next build`.
  await connection();
  const site = await getSiteInfo();

  return (
    <main>
      <h1>{site.name.fa}</h1>
    </main>
  );
}
