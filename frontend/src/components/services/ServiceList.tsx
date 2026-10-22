import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** `<ServiceList>` in content/services.*.mdx: the service cards in a grid, three across from lg. */
export function ServiceList({ children }: { children: ReactNode }) {
  // role="list": Safari drops list semantics from a list without bullets.
  return (
    <ul role="list" className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}

type ServiceProps = {
  /** The service's name; the card's heading. */
  title: string;
  children: ReactNode;
};

/** `<Service title="…">` — one thing a client can hire me for, with a short description as the card's body. */
export function Service({ title, children }: ServiceProps) {
  return (
    <li>
      <Card className="h-full">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-4">{children}</div>
      </Card>
    </li>
  );
}
