import DOMPurify from "isomorphic-dompurify";

/**
 * The standard sanitizer for any HTML this app renders instead of letting
 * JSX escape it as plain text — i.e. before a `dangerouslySetInnerHTML`, or
 * before persisting HTML a user submitted. JSX text nodes (`{value}`) are
 * already XSS-safe on their own and never need this; reach for it only at
 * an actual HTML-injection sink.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
