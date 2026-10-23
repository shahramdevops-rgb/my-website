// The kinds of request the contact page knows (`/contact?type=hiring|project`, architecture.md §5): the home
// page's paths and the Services CTA link here with one chosen. The P9 form will preselect its request type from it.
export const contactRequestTypes = ["hiring", "project"] as const;

export type ContactRequestType = (typeof contactRequestTypes)[number];

/**
 * The `type` query value as a known request type, or `null` for anything else (missing, unknown, repeated). The
 * raw value is only compared, never shown, so whatever a link puts there can't reach the page.
 */
export function parseContactRequestType(
  value: string | string[] | undefined,
): ContactRequestType | null {
  return contactRequestTypes.find((type) => type === value) ?? null;
}
