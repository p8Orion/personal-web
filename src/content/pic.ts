/** Card and overlay photos live in `src/content/images/` and are copied to `images/` on build. */
export function pic(file: string): string {
  return `${import.meta.env.BASE_URL}images/${file}`
}
