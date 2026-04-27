/**
 * Generates a deterministic warm-toned gradient from a recipe id.
 * Used when no hero image has been uploaded.
 */
export function placeholderGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  const hue = (hash % 60) + 20; // 20–80: warm amber/cream range
  const lightA = 75 + ((hash >> 4) % 12);
  const lightB = 85 + ((hash >> 8) % 10);

  return `linear-gradient(135deg, oklch(${lightA}% 0.06 ${hue}), oklch(${lightB}% 0.04 ${hue + 15}))`;
}
