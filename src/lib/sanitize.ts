import sanitizeHtml from "sanitize-html";

/**
 * Server-side HTML sanitizer for rendering email bodies.
 * Runs in Node (no jsdom), so it's safe inside React Server Components.
 */
export function sanitizeEmailHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ]),
    allowedAttributes: {
      "*": ["style", "align", "width", "height", "bgcolor", "color"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}
