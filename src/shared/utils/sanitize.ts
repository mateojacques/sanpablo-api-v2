import sanitizeHtml from 'sanitize-html';

/**
 * Default allowed tags for product descriptions and general content
 */
const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'a',
];

/**
 * Default allowed attributes
 */
const DEFAULT_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
};

/**
 * Default options for sanitization
 */
const DEFAULT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: DEFAULT_ALLOWED_TAGS,
  allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto'],
  // Force rel="noopener noreferrer" on links
  transformTags: {
    a: (tagName, attribs) => {
      return {
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      };
    },
  },
};

/**
 * Strict options - only allows text formatting, no links
 */
const STRICT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u'],
  allowedAttributes: {},
};

/**
 * Plain text options - strips all HTML
 */
const PLAIN_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/**
 * Sanitize HTML content using default options
 * Allows common formatting tags and safe links
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitize(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, DEFAULT_OPTIONS);
}

/**
 * Sanitize HTML with strict options (only basic formatting)
 * Does not allow links or other interactive elements
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeStrict(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, STRICT_OPTIONS);
}

/**
 * Strip all HTML tags and return plain text
 *
 * @param html - The HTML string to strip
 * @returns Plain text string
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, PLAIN_TEXT_OPTIONS);
}

/**
 * Sanitize HTML with custom options
 *
 * @param html - The HTML string to sanitize
 * @param options - Custom sanitize-html options
 * @returns Sanitized HTML string
 */
export function sanitizeCustom(html: string, options: sanitizeHtml.IOptions): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, options);
}

/**
 * Sanitize an object's string properties recursively
 * Useful for sanitizing request bodies
 *
 * @param obj - Object to sanitize
 * @param fields - Array of field names to sanitize (if empty, sanitizes all strings)
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields?: string[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      // Only sanitize specified fields, or all if none specified
      if (!fields || fields.includes(key)) {
        (result as Record<string, unknown>)[key] = sanitize(value);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      (result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        fields
      );
    }
  }

  return result;
}
