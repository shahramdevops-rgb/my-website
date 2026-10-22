import { BentoCard } from "@/components/ui/BentoCard";
import { Tag } from "@/components/ui/Tag";
import type { Resume } from "@/lib/resume/get-resume";

type StackCardProps = {
  title: string;
  description: string;
  tech: Resume["techStack"];
};

/**
 * The keyboard hero's slot (P3-T3). Today: the résumé's tech stack as a list — the same keycaps the 3D keyboard will
 * carry, and the start of its accessible equivalent. P3-T3 puts the static poster and the lazy-loaded keyboard here;
 * the card keeps its size (2 × 2 cells), so the swap moves nothing around it.
 */
export function StackCard({ title, description, tech }: StackCardProps) {
  return (
    <BentoCard as="section" labelledBy="home-stack" columns={2} rows={2} className="flex flex-col">
      <h2 id="home-stack" className="text-xl font-bold">
        {title}
      </h2>
      <p className="mt-2 text-muted">{description}</p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {tech.map((item) => (
          <li key={item.id}>
            <Tag>{item.name}</Tag>
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}
