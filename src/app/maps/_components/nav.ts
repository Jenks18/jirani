export const NAV = [
  { href: '/', label: 'Live map', icon: 'map' },
  { href: '/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/areas', label: 'Areas', icon: 'areas' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/news', label: 'News', icon: 'news' },
  { href: '/communities', label: 'Communities', icon: 'users' },
  { href: '/account', label: 'My account', icon: 'user' },
] as const;

/** The maps host rewrites "/x" to "/maps/x"; usePathname may report either, so normalise. */
export function normalizePath(p: string): string {
  const stripped = p.replace(/^\/maps(?=\/|$)/, '');
  return stripped === '' ? '/' : stripped;
}
