/**
 * Minutes to show for a post's reading time: never "0 min read". The text itself comes from the
 * `format.readingTime` message: `t("format.readingTime", { minutes: readingMinutes(post.readingMinutes) })`.
 */
export function readingMinutes(minutes: number): number {
  return Math.max(1, Math.ceil(minutes));
}
