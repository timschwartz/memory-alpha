/**
 * Extract category names from MediaWiki wikitext.
 * Strips <nowiki>, <!-- -->, and <pre> blocks before matching.
 */
export function extractCategories(wikitext: string): string[] {
  // Step 1: Remove <nowiki>...</nowiki> blocks
  let cleaned = wikitext.replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, '');

  // Step 2: Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Step 3: Remove <pre>...</pre> blocks
  cleaned = cleaned.replace(/<pre>[\s\S]*?<\/pre>/gi, '');

  // Step 4: Match [[Category:Name]] or [[Category:Name|Sort key]]
  const regex = /\[\[\s*[Cc]ategory\s*:\s*([^\]|]+?)(?:\s*\|[^\]]*)?\s*\]\]/g;

  const categories: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const name = match[1].trim();
    if (name) categories.push(name);
  }

  return [...new Set(categories)];
}
