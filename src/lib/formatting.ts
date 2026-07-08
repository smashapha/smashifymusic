export function formatDisplayTitle(rawTitle: string | undefined | null): string {
  if (!rawTitle) return 'Untitled';
  return rawTitle
    .replace(/^\d+[\s\-_.]+/, '')     // strip leading track numbers like "04-" or "04. "
    .replace(/[_]+/g, ' ')             // underscores to spaces
    .replace(/\s*-\s*/g, ' - ')        // normalize spacing around hyphens
    .replace(/\s{2,}/g, ' ')           // collapse repeated spaces
    .trim();
}
