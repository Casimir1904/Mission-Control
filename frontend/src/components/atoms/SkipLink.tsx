/**
 * SkipLink - Accessibility component for keyboard navigation
 *
 * Provides a "skip to main content" link that is visually hidden by default
 * but becomes visible when focused, allowing keyboard users to bypass
 * navigation menus and jump directly to the main content.
 */

interface SkipLinkProps {
  /** The ID of the main content element to skip to (default: "main-content") */
  targetId?: string;
  /** Custom label text for the link (default: "Skip to main content") */
  label?: string;
}

export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      {label}
    </a>
  );
}
