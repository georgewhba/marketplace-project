/**
 * Generate a URL-safe slug from Arabic or Latin text.
 * Arabic characters are preserved; special characters are removed.
 */
export function slugify(text: string): string {
  const slug = text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^\u0600-\u06FF\u0750-\u077Fa-z0-9-]/g, '') // Keep Arabic + Latin alphanumerics + dashes
    .replace(/-+/g, '-')            // Collapse multiple dashes
    .replace(/^-+|-+$/g, '');       // Trim leading/trailing dashes
    
  return slug || Math.random().toString(36).substring(2, 10); // Fallback if empty (e.g. only emojis)
}

/**
 * Generate a unique slug by appending a short random suffix.
 */
export function uniqueSlug(text: string): string {
  const base = slugify(text);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}
