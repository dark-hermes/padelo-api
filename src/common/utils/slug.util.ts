import slugify from 'slugify';

/**
 * Generate a URL-friendly slug and ensure uniqueness using the provided
 * existence-check function. If a slug already exists it appends a numeric
 * postfix: `slug`, `slug-1`, `slug-2`, ...
 *
 * @param base Source string to generate slug from (typically a name)
 * @param existsFn Async function that returns true when a slug already exists
 */
export async function generateUniqueSlug(
  base: string,
  existsFn: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugify(base || '', { lower: true, strict: true });
  if (!baseSlug) {
    // Fallback in case base produces empty slug
    const fallback = 'item';
    let i = 0;
    let candidate = fallback;
    while (await existsFn(candidate)) {
      i += 1;
      candidate = `${fallback}-${i}`;
    }
    return candidate;
  }

  let candidate = baseSlug;
  let counter = 0;

  while (await existsFn(candidate)) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}
