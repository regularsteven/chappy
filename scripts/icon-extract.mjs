/**
 * Extracts the best favicon/app icon URL from HTML.
 * Used by the automated test for webexpo.net.
 * @param {string} html - Raw HTML string
 * @param {string} baseUrl - Base URL for resolving relative hrefs
 * @returns {string|null} Best icon URL or null
 */
export function pickIconUrlFromHtml(html, baseUrl) {
  const base = new URL(baseUrl);
  const resolve = (href) => {
    if (!href || typeof href !== 'string') return null;
    try {
      return new URL(href, base).toString();
    } catch {
      return null;
    }
  };

  const appleTouchIcons = [];
  const shortcutIcons = [];
  const genericIcons = [];

  const linkRe = /<link\s+([^>]+)\s*\/?>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const attrs = m[1];
    const relMatch = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const sizesMatch = attrs.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase().trim();
    const href = hrefMatch[1].trim();
    const sizes = sizesMatch ? sizesMatch[1].trim() : '';

    if (rel.includes('apple-touch-icon')) {
      const url = resolve(href);
      if (url) {
        const sizeMatch = sizes.match(/(\d+)\s*x\s*(\d+)/i);
        const px = sizeMatch ? Math.min(parseInt(sizeMatch[1], 10), parseInt(sizeMatch[2], 10)) : 0;
        appleTouchIcons.push({ url, px });
      }
    } else if (rel.includes('shortcut') && rel.includes('icon')) {
      const url = resolve(href);
      if (url) shortcutIcons.push({ url });
    } else if (rel === 'icon') {
      const url = resolve(href);
      if (url) genericIcons.push({ url });
    }
  }

  if (appleTouchIcons.length > 0) {
    appleTouchIcons.sort((a, b) => b.px - a.px);
    const reasonable = appleTouchIcons.find((c) => c.px >= 96 && c.px <= 180) || appleTouchIcons[0];
    return reasonable.url;
  }
  if (shortcutIcons.length > 0) return shortcutIcons[0].url;
  if (genericIcons.length > 0) return genericIcons[0].url;
  const faviconUrl = resolve('/favicon.ico');
  return faviconUrl;
}
