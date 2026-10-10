'use client';

import { usePathname } from 'next/navigation';

/**
 * Task 16c — Page transition wrapper.
 *
 * Wraps the current page's children with a `key` set to the current
 * pathname. When the route changes, React unmounts the old wrapper and
 * mounts a fresh one, which re-triggers the CSS animation defined in
 * globals.css (`.sxl-page-fade` → `@keyframes sxlPageFade`).
 *
 * Result: every navigation gently fades + lifts the new page in,
 * giving the app a smooth, professional feel without a loading spinner.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="sxl-page-fade">
      {children}
    </div>
  );
}
